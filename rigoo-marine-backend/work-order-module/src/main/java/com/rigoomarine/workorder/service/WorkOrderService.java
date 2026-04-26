package com.rigoomarine.workorder.service;

import com.rigoomarine.workorder.entity.WorkOrder;
import com.rigoomarine.workorder.repository.WorkOrderRepository;
import com.rigoomarine.workorder.dto.WorkOrderDTO;
import com.rigoomarine.workorder.dto.CreateWorkOrderRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

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

    @Transactional(readOnly = true)
    public WorkOrderDTO getWorkOrderById(Long id) {
        return workOrderRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Work order not found"));
    }

    public WorkOrderDTO updateStatus(Long id, String status) {
        WorkOrder workOrder = workOrderRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Work order not found"));

        workOrder.setStatus(WorkOrder.WorkOrderStatus.valueOf(status));

        if (status.equals("COMPLETED")) {
            workOrder.setCompletedAt(java.time.LocalDateTime.now());
        }

        WorkOrder updated = workOrderRepository.save(workOrder);
        sendNotificationEvent(updated, "WORK_ORDER_STATUS_CHANGED");
        return toDTO(updated);
    }

    public WorkOrderDTO assignTechnician(Long id, Long technicianId) {
        WorkOrder workOrder = workOrderRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Work order not found"));

        workOrder.setAssignedTechnicianId(technicianId);
        workOrder.setStatus(WorkOrder.WorkOrderStatus.IN_PROGRESS);

        WorkOrder updated = workOrderRepository.save(workOrder);
        sendNotificationEvent(updated, "TECHNICIAN_ASSIGNED");
        return toDTO(updated);
    }

    public void deleteWorkOrder(Long id) {
        workOrderRepository.deleteById(id);
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
            .severity(workOrder.getSeverity())
            .symptoms(workOrder.getSymptoms())
            .mediaUrls(mediaUrls)
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
