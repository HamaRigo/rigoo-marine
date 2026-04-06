package com.rigoomarine.technician.controller;

import com.rigoomarine.technician.dto.TechnicianDTO;
import com.rigoomarine.technician.service.TechnicianService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/technician")
@RequiredArgsConstructor
public class TechnicianDashboardController {

    private final TechnicianService technicianService;

    // ============== Dashboard Stats ==============

    @GetMapping("/dashboard/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats(
            @AuthenticationPrincipal User userDetails
    ) {
        List<TechnicianDTO> allTechnicians = technicianService.getAllTechnicians();
        List<TechnicianDTO> available = technicianService.getAvailableTechnicians();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTechnicians", allTechnicians.size());
        stats.put("availableTechnicians", available.size());
        // TODO: Fetch from work-order-service when integrated
        stats.put("pendingOrders", 0L);
        stats.put("inProgressOrders", 0L);
        stats.put("completedToday", 0L);

        if (userDetails != null) {
            stats.put("currentUser", userDetails.getUsername());
        }

        log.debug("Dashboard stats requested by {}", userDetails != null ? userDetails.getUsername() : "anonymous");
        return ResponseEntity.ok(stats);
    }

    // ============== Work Order Management ==============

    @GetMapping("/orders")
    public ResponseEntity<List<Map<String, Object>>> getMyOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long technicianId,
            @AuthenticationPrincipal User userDetails
    ) {
        // TODO: Call work-order-service to fetch orders assigned to technician
        // For now, return empty list with proper logging
        log.info("Get technician orders - status={}, technicianId={}, user={}",
                status, technicianId, userDetails != null ? userDetails.getUsername() : "anonymous");

        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrderById(
            @PathVariable Long id,
            @AuthenticationPrincipal User userDetails
    ) {
        // TODO: Call work-order-service to fetch order details
        log.info("Get order {} for technician {}", id,
                userDetails != null ? userDetails.getUsername() : "anonymous");

        Map<String, Object> order = new HashMap<>();
        order.put("id", id);
        order.put("status", "PENDING");
        order.put("description", "Order details from work-order-service (not yet integrated)");
        order.put("message", "This endpoint will proxy to work-order-service in production");

        return ResponseEntity.ok(order);
    }

    @PatchMapping("/orders/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> statusUpdate,
            @AuthenticationPrincipal User userDetails
    ) {
        String newStatus = statusUpdate.get("status");

        log.info("Update order {} status to {} for technician {}",
                id, newStatus, userDetails != null ? userDetails.getUsername() : "anonymous");

        // TODO: Call work-order-service to update status
        Map<String, Object> response = new HashMap<>();
        response.put("id", id);
        response.put("status", newStatus);
        response.put("updatedAt", LocalDateTime.now().toString());
        response.put("updatedBy", userDetails != null ? userDetails.getUsername() : "anonymous");
        response.put("message", "Status update will be sent to work-order-service in production");

        return ResponseEntity.ok(response);
    }

    // ============== Notes ==============

    @PostMapping("/orders/{id}/notes")
    public ResponseEntity<Map<String, Object>> addNote(
            @PathVariable Long id,
            @RequestBody Map<String, String> noteData,
            @AuthenticationPrincipal User userDetails
    ) {
        String content = noteData.get("content");

        log.info("Add note to order {} by technician {}",
                id, userDetails != null ? userDetails.getUsername() : "anonymous");

        // TODO: Save note via work-order-service or dedicated note service
        Map<String, Object> note = new HashMap<>();
        note.put("id", 1L);
        note.put("workOrderId", id);
        note.put("content", content);
        note.put("createdAt", LocalDateTime.now().toString());
        note.put("createdBy", userDetails != null ? userDetails.getUsername() : "anonymous");
        note.put("message", "Note will be saved via work-order-service in production");

        return ResponseEntity.ok(note);
    }

    // ============== Time Tracking ==============

    @PostMapping("/orders/{id}/time-entries")
    public ResponseEntity<Map<String, Object>> addTimeEntry(
            @PathVariable Long id,
            @RequestBody Map<String, Object> timeEntry,
            @AuthenticationPrincipal User userDetails
    ) {
        Integer duration = (Integer) timeEntry.get("duration");
        String activity = (String) timeEntry.get("activity");

        log.info("Add time entry to order {} - {} minutes by technician {}",
                id, duration, userDetails != null ? userDetails.getUsername() : "anonymous");

        // TODO: Save time entry via work-order-service
        Map<String, Object> entry = new HashMap<>();
        entry.put("id", 1L);
        entry.put("workOrderId", id);
        entry.put("duration", duration);
        entry.put("activity", activity);
        entry.put("loggedAt", LocalDateTime.now().toString());
        entry.put("technicianEmail", userDetails != null ? userDetails.getUsername() : "anonymous");
        entry.put("message", "Time entry will be saved via work-order-service in production");

        return ResponseEntity.ok(entry);
    }

    // ============== Work History ==============

    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> getWorkHistory(
            @AuthenticationPrincipal User userDetails
    ) {
        log.info("Get work history for technician {}",
                userDetails != null ? userDetails.getUsername() : "anonymous");

        // TODO: Fetch completed orders from work-order-service
        return ResponseEntity.ok(List.of());
    }
}
