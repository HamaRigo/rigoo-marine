package com.rigoomarine.workorder.service;

import com.rigoomarine.workorder.client.ServiceCatalogClient;
import com.rigoomarine.workorder.client.VesselOwnershipClient;
import com.rigoomarine.workorder.dto.PostUpdateRequest;
import com.rigoomarine.workorder.dto.WorkOrderAttachmentDTO;
import com.rigoomarine.workorder.dto.WorkOrderUpdateDTO;
import com.rigoomarine.workorder.entity.SubmittedByRole;
import com.rigoomarine.workorder.entity.WorkOrder;
import com.rigoomarine.workorder.entity.WorkOrderAttachment;
import com.rigoomarine.workorder.entity.WorkOrderUpdate;
import com.rigoomarine.workorder.event.WorkOrderCompletedEvent;
import com.rigoomarine.workorder.event.WorkOrderEventPublisher;
import com.rigoomarine.workorder.exception.WorkOrderNotFoundException;
import com.rigoomarine.workorder.repository.WorkOrderAttachmentRepository;
import com.rigoomarine.workorder.repository.WorkOrderRepository;
import com.rigoomarine.workorder.repository.WorkOrderUpdateRepository;
import com.rigoomarine.workorder.dto.WorkOrderDTO;
import com.rigoomarine.workorder.dto.CreateWorkOrderRequest;
import com.rigoomarine.workorder.dto.ServiceRequestRequest;
import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.common.security.SecurityUtils;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderUpdateRepository workOrderUpdateRepository;
    private final WorkOrderAttachmentRepository workOrderAttachmentRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final VesselOwnershipClient vesselOwnershipClient;
    private final ServiceCatalogClient serviceCatalogClient;
    private final WorkOrderEventPublisher workOrderEventPublisher;

    @Value("${app.work-order.upload-dir:./uploads/work-orders}")
    private String uploadDir;

    public WorkOrderDTO createWorkOrder(CreateWorkOrderRequest request) {
        // Convert mediaUrls set to JSON string for storage
        String mediaUrlsJson = null;
        if (request.getMediaUrls() != null && !request.getMediaUrls().isEmpty()) {
            mediaUrlsJson = request.getMediaUrls().stream()
                .map(url -> "\"" + url + "\"")
                .collect(Collectors.joining(",", "[", "]"));
        }

        WorkOrder workOrder = WorkOrder.builder()
            .clientId(request.getClientId())
            .vesselId(request.getVesselId())
            .description(request.getDescription())
            .priority(request.getPriority() != null ? request.getPriority() : "NORMAL")
            .preferredDate(request.getPreferredDate())
            .status(WorkOrder.WorkOrderStatus.PENDING)
            .serviceIds(request.getServiceIds() != null ? request.getServiceIds() : java.util.Set.of())
            .notes(request.getNotes())
            .issueCategory(request.getIssueCategory())
            .severity(request.getSeverity())
            .symptoms(request.getSymptoms())
            .mediaUrls(mediaUrlsJson)
            .build();

        WorkOrder saved = workOrderRepository.save(workOrder);

        // Send notification event
        sendNotificationEvent(saved, "WORK_ORDER_CREATED");

        return toDTO(saved);
    }

    public WorkOrderDTO submitServiceRequest(ServiceRequestRequest request) {
        // Identity override: clients cannot submit on behalf of someone else, nor claim
        // submittedByRole=TECHNICIAN to bypass approval. Only ADMIN/TECHNICIAN actors
        // honor the request body's clientId + submittedByRole.
        Long effectiveClientId = request.getClientId();
        SubmittedByRole effectiveSubmittedBy = request.getSubmittedByRole();

        AuthenticatedUser actor = SecurityUtils.currentUser().orElse(null);
        if (actor == null || !(actor.hasRole("ADMIN") || actor.hasRole("TECHNICIAN"))) {
            Long jwtClientId = actor != null ? actor.getClientId() : null;
            if (jwtClientId == null) {
                throw new IllegalStateException("SESSION_RESTART_REQUIRED");
            }
            if (!jwtClientId.equals(request.getClientId())) {
                log.info("audit.identity_override actor={} requestedClientId={} effectiveClientId={}",
                    actor.getEmail(), request.getClientId(), jwtClientId);
            }
            effectiveClientId = jwtClientId;
            effectiveSubmittedBy = SubmittedByRole.CLIENT;
        }

        // Cross-service ownership check: vessel-service is the source of truth for
        // vessel→client mapping. Uses the internal endpoint with an explicit
        // ownerClientId — so TECHNICIAN/ADMIN submissions are validated against the
        // body's effectiveClientId (not the staff caller's JWT identity, which would
        // short-circuit via read-all). Throws VesselNotOwnedException (→ 400) on
        // mismatch, VesselLookupUnavailableException (→ 503) on outage.
        vesselOwnershipClient.verifyAccess(request.getVesselId(), effectiveClientId);

        String mediaUrlsJson = null;
        if (request.getMediaUrls() != null && !request.getMediaUrls().isEmpty()) {
            mediaUrlsJson = request.getMediaUrls().stream()
                .map(url -> "\"" + url + "\"")
                .collect(Collectors.joining(",", "[", "]"));
        }

        String issueCategoryOther = request.getIssueCategory() == com.rigoomarine.workorder.entity.IssueCategory.OTHER
            ? request.getIssueCategoryOther()
            : null;

        WorkOrder workOrder = WorkOrder.builder()
            .clientId(effectiveClientId)
            .vesselId(request.getVesselId())
            .description(request.getDescription())
            .priority("NORMAL")
            .status(WorkOrder.WorkOrderStatus.PENDING_APPROVAL)
            .serviceIds(java.util.Set.of())
            .locationText(request.getLocationText())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .phone(request.getPhone())
            .submittedByRole(effectiveSubmittedBy)
            .issueCategory(request.getIssueCategory().name())
            .issueCategoryOther(issueCategoryOther)
            .mediaUrls(mediaUrlsJson)
            .build();

        WorkOrder saved = workOrderRepository.save(workOrder);
        sendNotificationEvent(saved, "SERVICE_REQUEST_SUBMITTED");
        return toDTO(saved);
    }

    public WorkOrderDTO approveServiceRequest(Long id, Long approverId) {
        WorkOrder workOrder = workOrderRepository.findById(id)
            .orElseThrow(() -> new WorkOrderNotFoundException(id));
        if (workOrder.getStatus() != WorkOrder.WorkOrderStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Only PENDING_APPROVAL work orders can be approved");
        }
        workOrder.setStatus(WorkOrder.WorkOrderStatus.PENDING);
        workOrder.setApprovedAt(java.time.LocalDateTime.now());
        workOrder.setApprovedBy(approverId);
        WorkOrder saved = workOrderRepository.save(workOrder);
        sendNotificationEvent(saved, "SERVICE_REQUEST_APPROVED");
        return toDTO(saved);
    }

    public WorkOrderDTO rejectServiceRequest(Long id, Long approverId, String reason) {
        WorkOrder workOrder = workOrderRepository.findById(id)
            .orElseThrow(() -> new WorkOrderNotFoundException(id));
        if (workOrder.getStatus() != WorkOrder.WorkOrderStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Only PENDING_APPROVAL work orders can be rejected");
        }
        workOrder.setStatus(WorkOrder.WorkOrderStatus.CANCELLED);
        workOrder.setRejectionReason(reason);
        workOrder.setApprovedBy(approverId);
        WorkOrder saved = workOrderRepository.save(workOrder);
        sendNotificationEvent(saved, "SERVICE_REQUEST_REJECTED");
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<WorkOrderDTO> getWorkOrdersByClientId(Long clientId) {
        return workOrderRepository.findByClientId(clientId).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkOrderDTO> getAllWorkOrders() {
        return workOrderRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    /**
     * Filterable + paginated list for admin / technician views.
     * @param q        free-text matched against description / notes / location_text (case-insensitive)
     * @param status   exact match on status (e.g. PENDING_APPROVAL)
     * @param submittedByRole exact match on submitter role
     * @param technicianId    exact match on assigned technician
     */
    @Transactional(readOnly = true)
    public Page<WorkOrderDTO> searchPaged(
            String q,
            String status,
            String submittedByRole,
            Long technicianId,
            Pageable pageable
    ) {
        Specification<WorkOrder> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("notes"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("locationText"), "")), like)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), WorkOrder.WorkOrderStatus.valueOf(status)));
            }
            if (submittedByRole != null && !submittedByRole.isBlank()) {
                predicates.add(cb.equal(root.get("submittedByRole"),
                        com.rigoomarine.workorder.entity.SubmittedByRole.valueOf(submittedByRole)));
            }
            if (technicianId != null) {
                predicates.add(cb.equal(root.get("assignedTechnicianId"), technicianId));
            }
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return workOrderRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public WorkOrderDTO getWorkOrderById(Long id) {
        return workOrderRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new WorkOrderNotFoundException(id));
    }

    public WorkOrderDTO updateStatus(Long id, String status) {
        WorkOrder workOrder = workOrderRepository.findById(id)
            .orElseThrow(() -> new WorkOrderNotFoundException(id));

        WorkOrder.WorkOrderStatus previousStatus = workOrder.getStatus();
        WorkOrder.WorkOrderStatus nextStatus = WorkOrder.WorkOrderStatus.valueOf(status);

        workOrder.setStatus(nextStatus);

        if (status.equals("COMPLETED")) {
            workOrder.setCompletedAt(java.time.LocalDateTime.now());
        }

        WorkOrder updated = workOrderRepository.save(workOrder);
        sendNotificationEvent(updated, "WORK_ORDER_STATUS_CHANGED");

        // Auto-create maintenance history: publish only on the FIRST transition
        // into COMPLETED. Re-completing a re-opened WO is a no-op upstream and
        // is deduped downstream via the (work_order_id, service_type) constraint,
        // but skipping here avoids unnecessary work and Kafka traffic.
        if (nextStatus == WorkOrder.WorkOrderStatus.COMPLETED
            && previousStatus != WorkOrder.WorkOrderStatus.COMPLETED) {
            publishCompletedEvent(updated);
        }
        return toDTO(updated);
    }

    private void publishCompletedEvent(WorkOrder wo) {
        if (wo.getVesselId() == null || wo.getClientId() == null) {
            log.warn("Skipping WorkOrderCompletedEvent — missing vesselId/clientId on WO {}", wo.getId());
            return;
        }
        // Catalog lookup is fail-open: if service-service is down the consumer
        // falls back to mapping from issueCategory.
        List<String> serviceNames = serviceCatalogClient.getNamesList(wo.getServiceIds());

        WorkOrderCompletedEvent event = WorkOrderCompletedEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .eventType("WorkOrderCompletedEvent")
            .occurredAt(Instant.now())
            .workOrderId(wo.getId())
            .clientId(wo.getClientId())
            .vesselId(wo.getVesselId())
            .technicianId(wo.getAssignedTechnicianId())
            .completedAt(wo.getCompletedAt())
            .serviceIds(wo.getServiceIds())
            .serviceNames(serviceNames)
            .issueCategory(wo.getIssueCategory())
            .notes(wo.getNotes())
            .build();
        workOrderEventPublisher.publishAfterCommit(event);
    }

    public WorkOrderDTO assignTechnician(Long id, Long technicianId) {
        WorkOrder workOrder = workOrderRepository.findById(id)
            .orElseThrow(() -> new WorkOrderNotFoundException(id));

        workOrder.setAssignedTechnicianId(technicianId);
        workOrder.setStatus(WorkOrder.WorkOrderStatus.IN_PROGRESS);

        WorkOrder updated = workOrderRepository.save(workOrder);
        sendNotificationEvent(updated, "TECHNICIAN_ASSIGNED");
        return toDTO(updated);
    }

    public void deleteWorkOrder(Long id) {
        WorkOrder wo = workOrderRepository.findById(id)
            .orElseThrow(() -> new WorkOrderNotFoundException(id));
        workOrderRepository.delete(wo);
    }

    // ── Updates (work log / timeline) ─────────────────────────────────────────

    public WorkOrderUpdateDTO postUpdate(Long workOrderId, PostUpdateRequest req) {
        workOrderRepository.findById(workOrderId)
            .orElseThrow(() -> new WorkOrderNotFoundException(workOrderId));

        AuthenticatedUser actor = SecurityUtils.currentUser()
            .orElseThrow(() -> new IllegalStateException("No authenticated user"));
        String role = actor.getRoles().stream()
            .findFirst()
            .map(r -> r.replace("ROLE_", ""))
            .orElse("UNKNOWN");

        WorkOrderUpdate update = WorkOrderUpdate.builder()
            .workOrderId(workOrderId)
            .authorId(actor.getClientId())
            .authorRole(role)
            .message(req.getMessage())
            .visibleToClient(req.isVisibleToClient())
            .build();

        return toUpdateDTO(workOrderUpdateRepository.save(update));
    }

    @Transactional(readOnly = true)
    public List<WorkOrderUpdateDTO> getUpdates(Long workOrderId) {
        workOrderRepository.findById(workOrderId)
            .orElseThrow(() -> new WorkOrderNotFoundException(workOrderId));
        return workOrderUpdateRepository.findByWorkOrderIdOrderByCreatedAtAsc(workOrderId)
            .stream().map(this::toUpdateDTO).collect(Collectors.toList());
    }

    // ── Attachments ────────────────────────────────────────────────────────────

    public WorkOrderAttachmentDTO uploadAttachment(Long workOrderId, MultipartFile file) {
        workOrderRepository.findById(workOrderId)
            .orElseThrow(() -> new WorkOrderNotFoundException(workOrderId));

        AuthenticatedUser actor = SecurityUtils.currentUser()
            .orElseThrow(() -> new IllegalStateException("No authenticated user"));

        String originalName = StringUtils.cleanPath(
            file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload");
        String storedName = UUID.randomUUID() + "_" + originalName;

        Path dir = Paths.get(uploadDir, String.valueOf(workOrderId));
        try {
            Files.createDirectories(dir);
            Path dest = dir.resolve(storedName);
            file.transferTo(dest);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store attachment: " + e.getMessage(), e);
        }

        WorkOrderAttachment attachment = WorkOrderAttachment.builder()
            .workOrderId(workOrderId)
            .uploadedBy(actor.getClientId())
            .filePath(dir.resolve(storedName).toAbsolutePath().toString())
            .originalName(originalName)
            .contentType(file.getContentType())
            .fileSize(file.getSize())
            .build();

        WorkOrderAttachment saved = workOrderAttachmentRepository.save(attachment);
        return toAttachmentDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<WorkOrderAttachmentDTO> getAttachments(Long workOrderId) {
        workOrderRepository.findById(workOrderId)
            .orElseThrow(() -> new WorkOrderNotFoundException(workOrderId));
        return workOrderAttachmentRepository.findByWorkOrderIdOrderByCreatedAtAsc(workOrderId)
            .stream().map(this::toAttachmentDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WorkOrderAttachment getAttachmentEntity(Long workOrderId, Long attachmentId) {
        WorkOrderAttachment a = workOrderAttachmentRepository.findById(attachmentId)
            .orElseThrow(() -> new WorkOrderNotFoundException(attachmentId));
        if (!a.getWorkOrderId().equals(workOrderId)) {
            throw new WorkOrderNotFoundException(attachmentId);
        }
        return a;
    }

    // ── Assigned queue (technician's own work orders) ─────────────────────────

    @Transactional(readOnly = true)
    public List<WorkOrderDTO> getAssignedOrders() {
        Long technicianId = SecurityUtils.currentUser()
            .map(AuthenticatedUser::getClientId)
            .orElseThrow(() -> new IllegalStateException("No authenticated user"));
        return workOrderRepository.findByAssignedTechnicianId(technicianId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private WorkOrderUpdateDTO toUpdateDTO(WorkOrderUpdate u) {
        return WorkOrderUpdateDTO.builder()
            .id(u.getId())
            .workOrderId(u.getWorkOrderId())
            .authorId(u.getAuthorId())
            .authorRole(u.getAuthorRole())
            .message(u.getMessage())
            .visibleToClient(u.isVisibleToClient())
            .createdAt(u.getCreatedAt())
            .build();
    }

    private WorkOrderAttachmentDTO toAttachmentDTO(WorkOrderAttachment a) {
        return WorkOrderAttachmentDTO.builder()
            .id(a.getId())
            .workOrderId(a.getWorkOrderId())
            .uploadedBy(a.getUploadedBy())
            .originalName(a.getOriginalName())
            .contentType(a.getContentType())
            .fileSize(a.getFileSize())
            .downloadUrl("/api/work-orders/" + a.getWorkOrderId() + "/attachments/" + a.getId() + "/download")
            .createdAt(a.getCreatedAt())
            .build();
    }

    private void sendNotificationEvent(WorkOrder workOrder, String eventType) {
        try {
            kafkaTemplate.send("work-order-events", new NotificationEvent(
                eventType,
                workOrder.getId(),
                workOrder.getClientId(),
                workOrder.getStatus().name(),
                java.time.LocalDateTime.now()
            ));
        } catch (Exception e) {
            // Log but don't fail the operation
        }
    }

    private WorkOrderDTO toDTO(WorkOrder workOrder) {
        // Parse mediaUrls JSON string back to Set
        java.util.Set<String> mediaUrls = java.util.Set.of();
        if (workOrder.getMediaUrls() != null && workOrder.getMediaUrls().startsWith("[")) {
            String json = workOrder.getMediaUrls();
            // Simple parsing: extract strings between quotes
            mediaUrls = java.util.regex.Pattern.compile("\"([^\"]+)\"")
                .matcher(json)
                .results()
                .map(m -> m.group(1))
                .collect(java.util.stream.Collectors.toSet());
        }

        return WorkOrderDTO.builder()
            .id(workOrder.getId())
            .clientId(workOrder.getClientId())
            .vesselId(workOrder.getVesselId())
            .status(workOrder.getStatus().name())
            .description(workOrder.getDescription())
            .priority(workOrder.getPriority())
            .preferredDate(workOrder.getPreferredDate())
            .assignedTechnicianId(workOrder.getAssignedTechnicianId())
            .notes(workOrder.getNotes())
            .serviceIds(workOrder.getServiceIds())
            .createdAt(workOrder.getCreatedAt())
            .updatedAt(workOrder.getUpdatedAt())
            .completedAt(workOrder.getCompletedAt())
            .issueCategory(workOrder.getIssueCategory())
            .issueCategoryOther(workOrder.getIssueCategoryOther())
            .severity(workOrder.getSeverity())
            .symptoms(workOrder.getSymptoms())
            .mediaUrls(mediaUrls)
            .locationText(workOrder.getLocationText())
            .latitude(workOrder.getLatitude())
            .longitude(workOrder.getLongitude())
            .phone(workOrder.getPhone())
            .submittedByRole(workOrder.getSubmittedByRole() != null ? workOrder.getSubmittedByRole().name() : null)
            .rejectionReason(workOrder.getRejectionReason())
            .approvedAt(workOrder.getApprovedAt())
            .approvedBy(workOrder.getApprovedBy())
            .build();
    }

    // Inner class for Kafka events
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    private static class NotificationEvent {
        private String eventType;
        private Long workOrderId;
        private Long clientId;
        private String status;
        private java.time.LocalDateTime timestamp;
    }
}
