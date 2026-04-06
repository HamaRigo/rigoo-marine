package com.rigoomarine.client.controller;

import com.rigoomarine.client.dto.ClientDTO;
import com.rigoomarine.client.dto.CreateClientRequest;
import com.rigoomarine.client.service.ClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ClientService clientService;

    // ============== Dashboard Stats ==============

    @GetMapping("/dashboard/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        List<ClientDTO> allClients = clientService.getAllClients();

        long totalUsers = allClients.size();
        long adminCount = allClients.stream()
                .filter(c -> "ADMIN".equals(c.getRole()))
                .count();
        long technicianCount = allClients.stream()
                .filter(c -> "TECHNICIAN".equals(c.getRole()))
                .count();
        long clientCount = allClients.stream()
                .filter(c -> "CLIENT".equals(c.getRole()))
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("adminCount", adminCount);
        stats.put("technicianCount", technicianCount);
        stats.put("clientCount", clientCount);
        // TODO: Calculate from invoices when service is available
        stats.put("totalRevenue", BigDecimal.ZERO);
        // TODO: Fetch from work-order service
        stats.put("pendingOrders", 0L);
        stats.put("completedOrders", 0L);

        return ResponseEntity.ok(stats);
    }

    // ============== User Management ==============

    @GetMapping("/users")
    public ResponseEntity<List<ClientDTO>> getAllUsers() {
        return ResponseEntity.ok(clientService.getAllClients());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<ClientDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(clientService.getClientById(id));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<ClientDTO> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> roleUpdate
    ) {
        String newRole = roleUpdate.get("role");

        // Validate role
        if (newRole == null || !List.of("CLIENT", "ADMIN", "TECHNICIAN").contains(newRole)) {
            throw new IllegalArgumentException("Invalid role. Must be CLIENT, ADMIN, or TECHNICIAN");
        }

        ClientDTO existing = clientService.getClientById(id);

        CreateClientRequest request = new CreateClientRequest();
        request.setName(existing.getName());
        request.setEmail(existing.getEmail());
        request.setPhone(existing.getPhone());
        request.setAddress(existing.getAddress());
        request.setCompany(existing.getCompany());
        request.setRole(newRole);

        ClientDTO updated = clientService.updateClient(id, request);
        log.info("Updated user {} role to {}", id, newRole);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<ClientDTO> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> statusUpdate
    ) {
        // TODO: Implement when status field is added to Client entity
        log.warn("Update user status endpoint called but not yet implemented");
        return ResponseEntity.ok(clientService.getClientById(id));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        clientService.deleteClient(id);
        log.info("Deleted user {}", id);
        return ResponseEntity.noContent().build();
    }

    // ============== Order Management ==============
    // These endpoints are placeholders until work-order-service integration via Feign

    @GetMapping("/orders")
    public ResponseEntity<List<Map<String, Object>>> getAllOrders() {
        // TODO: Call work-order-service via Feign client in production
        log.debug("Get all orders - returning empty list (work-order-service not integrated)");
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrderById(@PathVariable Long id) {
        // TODO: Call work-order-service via Feign client in production
        log.debug("Get order {} - returning empty object (work-order-service not integrated)", id);
        return ResponseEntity.ok(new HashMap<>());
    }

    @PostMapping("/orders/{id}/assign")
    public ResponseEntity<Map<String, Object>> assignTechnician(
            @PathVariable Long id,
            @RequestBody Map<String, Long> assignment
    ) {
        // TODO: Call work-order-service via Feign client in production
        Long technicianId = assignment.get("technicianId");
        log.info("Assign technician {} to order {} - placeholder", technicianId, id);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Technician " + technicianId + " assigned to order " + id);
        response.put("orderId", id);
        response.put("technicianId", technicianId);
        return ResponseEntity.ok(response);
    }

    // ============== Service Management ==============
    // These endpoints are placeholders until service-service integration via Feign

    @GetMapping("/services")
    public ResponseEntity<List<Map<String, Object>>> getAllServices() {
        // TODO: Call service-service via Feign client in production
        log.debug("Get all services - returning empty list (service-service not integrated)");
        return ResponseEntity.ok(List.of());
    }

    @PostMapping("/services")
    public ResponseEntity<Map<String, Object>> createService(
            @RequestBody Map<String, Object> serviceData
    ) {
        // TODO: Call service-service via Feign client in production
        log.info("Create service - placeholder");
        return ResponseEntity.ok(serviceData);
    }

    @PutMapping("/services/{id}")
    public ResponseEntity<Map<String, Object>> updateService(
            @PathVariable Long id,
            @RequestBody Map<String, Object> serviceData
    ) {
        // TODO: Call service-service via Feign client in production
        log.info("Update service {} - placeholder", id);
        return ResponseEntity.ok(serviceData);
    }

    @DeleteMapping("/services/{id}")
    public ResponseEntity<Void> deleteService(@PathVariable Long id) {
        // TODO: Call service-service via Feign client in production
        log.info("Delete service {} - placeholder", id);
        return ResponseEntity.noContent().build();
    }
}
