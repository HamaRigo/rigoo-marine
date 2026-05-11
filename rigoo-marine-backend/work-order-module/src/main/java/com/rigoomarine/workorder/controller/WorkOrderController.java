package com.rigoomarine.workorder.controller;

import com.rigoomarine.workorder.dto.WorkOrderDTO;
import com.rigoomarine.workorder.dto.CreateWorkOrderRequest;
import com.rigoomarine.workorder.dto.ServiceRequestRequest;
import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.workorder.service.WorkOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/work-orders")
@RequiredArgsConstructor
public class WorkOrderController {

    private final WorkOrderService workOrderService;

    /**
     * Bulk-create path used by ops scripts and admin tools. Clients submit through
     * {@link #submitServiceRequest} instead.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<WorkOrderDTO> createWorkOrder(@Valid @RequestBody CreateWorkOrderRequest request) {
        return ResponseEntity.ok(workOrderService.createWorkOrder(request));
    }

    /**
     * Client-facing service-request submission. Identity is enforced inside the
     * service layer: clients can only submit as themselves, technicians can submit
     * on behalf of any client.
     */
    @PostMapping("/service-request")
    public ResponseEntity<WorkOrderDTO> submitServiceRequest(@Valid @RequestBody ServiceRequestRequest request) {
        return ResponseEntity.ok(workOrderService.submitServiceRequest(request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/approve")
    public ResponseEntity<WorkOrderDTO> approveServiceRequest(
        @PathVariable Long id,
        @RequestParam Long approverId
    ) {
        return ResponseEntity.ok(workOrderService.approveServiceRequest(id, approverId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/reject")
    public ResponseEntity<WorkOrderDTO> rejectServiceRequest(
        @PathVariable Long id,
        @RequestParam Long approverId,
        @RequestParam(required = false) String reason
    ) {
        return ResponseEntity.ok(workOrderService.rejectServiceRequest(id, approverId, reason));
    }

    /**
     * Returns the caller's work orders. clientId is derived from the JWT — the
     * previous {@code ?clientId=} query parameter is dropped to prevent spoofing.
     */
    @GetMapping("/my")
    public ResponseEntity<List<WorkOrderDTO>> getMyWorkOrders() {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        return ResponseEntity.ok(workOrderService.getWorkOrdersByClientId(clientId));
    }

    /**
     * Filterable + paginated list. ADMIN only — clients use /my for their own orders.
     * Cap page size at 100. Default sort: createdAt desc.
     */
    @PreAuthorize("hasRole('ADMIN')")
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

    @PreAuthorize("hasRole('ADMIN')")
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
}
