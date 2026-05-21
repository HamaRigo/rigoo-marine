package com.rigoomarine.workorder.controller;

import com.rigoomarine.workorder.dto.PostUpdateRequest;
import com.rigoomarine.workorder.dto.WorkOrderAttachmentDTO;
import com.rigoomarine.workorder.dto.WorkOrderDTO;
import com.rigoomarine.workorder.dto.WorkOrderUpdateDTO;
import com.rigoomarine.workorder.dto.CreateWorkOrderRequest;
import com.rigoomarine.workorder.dto.ServiceRequestRequest;
import com.rigoomarine.workorder.entity.WorkOrderAttachment;
import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.workorder.service.WorkOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.List;

@RestController
@RequestMapping("/api/work-orders")
@RequiredArgsConstructor
public class WorkOrderController {

    private final WorkOrderService workOrderService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<WorkOrderDTO> createWorkOrder(@Valid @RequestBody CreateWorkOrderRequest request) {
        return ResponseEntity.ok(workOrderService.createWorkOrder(request));
    }

    @PostMapping("/service-request")
    public ResponseEntity<WorkOrderDTO> submitServiceRequest(@Valid @RequestBody ServiceRequestRequest request) {
        return ResponseEntity.ok(workOrderService.submitServiceRequest(request));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    @PutMapping("/{id}/approve")
    public ResponseEntity<WorkOrderDTO> approveServiceRequest(
        @PathVariable Long id,
        @RequestParam Long approverId
    ) {
        return ResponseEntity.ok(workOrderService.approveServiceRequest(id, approverId));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    @PutMapping("/{id}/reject")
    public ResponseEntity<WorkOrderDTO> rejectServiceRequest(
        @PathVariable Long id,
        @RequestParam Long approverId,
        @RequestParam(required = false) String reason
    ) {
        return ResponseEntity.ok(workOrderService.rejectServiceRequest(id, approverId, reason));
    }

    @GetMapping("/my")
    public ResponseEntity<List<WorkOrderDTO>> getMyWorkOrders() {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        return ResponseEntity.ok(workOrderService.getWorkOrdersByClientId(clientId));
    }

    /**
     * Returns work orders assigned to the calling technician.
     * Accessible to TECHNICIAN and TEAM_LEAD roles.
     */
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'TEAM_LEAD', 'ADMIN')")
    @GetMapping("/assigned")
    public ResponseEntity<List<WorkOrderDTO>> getAssignedOrders() {
        return ResponseEntity.ok(workOrderService.getAssignedOrders());
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    @GetMapping
    public ResponseEntity<Page<WorkOrderDTO>> searchWorkOrders(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String submittedByRole,
            @RequestParam(required = false) Long technicianId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        Pageable pageable = pageable(page, size, sort);
        return ResponseEntity.ok(workOrderService.searchPaged(q, status, submittedByRole, technicianId, pageable));
    }

    private static Pageable pageable(int page, int size, String sort) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        String[] parts = sort.split(",", 2);
        Sort.Direction dir = parts.length > 1 && parts[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(Math.max(page, 0), safeSize, Sort.by(dir, parts[0]));
    }

    @PreAuthorize("hasRole('ADMIN') or @workOrderSecurity.canAccess(#id)")
    @GetMapping("/{id}")
    public ResponseEntity<WorkOrderDTO> getWorkOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(workOrderService.getWorkOrderById(id));
    }

    @PreAuthorize("hasRole('ADMIN') or @workOrderSecurity.canAccess(#id)")
    @PutMapping("/{id}/status")
    public ResponseEntity<WorkOrderDTO> updateWorkOrderStatus(
        @PathVariable Long id,
        @RequestParam String status
    ) {
        return ResponseEntity.ok(workOrderService.updateStatus(id, status));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    @PutMapping("/{id}/assign")
    public ResponseEntity<WorkOrderDTO> assignTechnician(
        @PathVariable Long id,
        @RequestParam Long technicianId
    ) {
        return ResponseEntity.ok(workOrderService.assignTechnician(id, technicianId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkOrder(@PathVariable Long id) {
        workOrderService.deleteWorkOrder(id);
        return ResponseEntity.noContent().build();
    }

    // ── Update timeline ───────────────────────────────────────────────────────

    @PreAuthorize("hasRole('ADMIN') or @workOrderSecurity.canAccess(#id)")
    @PostMapping("/{id}/updates")
    public ResponseEntity<WorkOrderUpdateDTO> postUpdate(
        @PathVariable Long id,
        @Valid @RequestBody PostUpdateRequest req
    ) {
        return ResponseEntity.ok(workOrderService.postUpdate(id, req));
    }

    @PreAuthorize("hasRole('ADMIN') or @workOrderSecurity.canAccess(#id)")
    @GetMapping("/{id}/updates")
    public ResponseEntity<List<WorkOrderUpdateDTO>> getUpdates(@PathVariable Long id) {
        return ResponseEntity.ok(workOrderService.getUpdates(id));
    }

    // ── Attachments ───────────────────────────────────────────────────────────

    @PreAuthorize("hasRole('ADMIN') or @workOrderSecurity.canAccess(#id)")
    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WorkOrderAttachmentDTO> uploadAttachment(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(workOrderService.uploadAttachment(id, file));
    }

    @PreAuthorize("hasRole('ADMIN') or @workOrderSecurity.canAccess(#id)")
    @GetMapping("/{id}/attachments")
    public ResponseEntity<List<WorkOrderAttachmentDTO>> listAttachments(@PathVariable Long id) {
        return ResponseEntity.ok(workOrderService.getAttachments(id));
    }

    @PreAuthorize("hasRole('ADMIN') or @workOrderSecurity.canAccess(#id)")
    @GetMapping("/{id}/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(
        @PathVariable Long id,
        @PathVariable Long attachmentId
    ) {
        WorkOrderAttachment attachment = workOrderService.getAttachmentEntity(id, attachmentId);
        File file = new File(attachment.getFilePath());
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(file);
        String contentType = attachment.getContentType() != null
            ? attachment.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + attachment.getOriginalName() + "\"")
            .contentType(MediaType.parseMediaType(contentType))
            .body(resource);
    }
}
