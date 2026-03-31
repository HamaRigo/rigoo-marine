package com.rigoomarine.workorder.controller;

import com.rigoomarine.workorder.dto.WorkOrderDTO;
import com.rigoomarine.workorder.dto.CreateWorkOrderRequest;
import com.rigoomarine.workorder.service.WorkOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/work-orders")
@RequiredArgsConstructor
public class WorkOrderController {

    private final WorkOrderService workOrderService;

    @PostMapping
    public ResponseEntity<WorkOrderDTO> createWorkOrder(@Valid @RequestBody CreateWorkOrderRequest request) {
        return ResponseEntity.ok(workOrderService.createWorkOrder(request));
    }

    @GetMapping("/my")
    public ResponseEntity<List<WorkOrderDTO>> getMyWorkOrders(@RequestParam Long clientId) {
        return ResponseEntity.ok(workOrderService.getWorkOrdersByClientId(clientId));
    }

    @GetMapping
    public ResponseEntity<List<WorkOrderDTO>> getAllWorkOrders() {
        return ResponseEntity.ok(workOrderService.getAllWorkOrders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkOrderDTO> getWorkOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(workOrderService.getWorkOrderById(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<WorkOrderDTO> updateWorkOrderStatus(
        @PathVariable Long id,
        @RequestParam String status
    ) {
        return ResponseEntity.ok(workOrderService.updateStatus(id, status));
    }

    @PutMapping("/{id}/assign")
    public ResponseEntity<WorkOrderDTO> assignTechnician(
        @PathVariable Long id,
        @RequestParam Long technicianId
    ) {
        return ResponseEntity.ok(workOrderService.assignTechnician(id, technicianId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkOrder(@PathVariable Long id) {
        workOrderService.deleteWorkOrder(id);
        return ResponseEntity.noContent().build();
    }
}
