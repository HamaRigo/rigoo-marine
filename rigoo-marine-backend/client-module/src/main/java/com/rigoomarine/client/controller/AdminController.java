package com.rigoomarine.client.controller;

import com.rigoomarine.client.dto.ClientDTO;
import com.rigoomarine.client.dto.CreateClientRequest;
import com.rigoomarine.client.dto.CreateMediaRequest;
import com.rigoomarine.client.dto.CreateContactInfoRequest;
import com.rigoomarine.client.dto.MediaDTO;
import com.rigoomarine.client.dto.ContactInfoDTO;
import com.rigoomarine.client.service.ClientService;
import com.rigoomarine.client.service.MediaService;
import com.rigoomarine.client.service.ContactInfoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
    private final MediaService mediaService;
    private final ContactInfoService contactInfoService;

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

    // ============== Invoice Management ==============

    @GetMapping("/invoices")
    public ResponseEntity<List<Map<String, Object>>> getAllInvoices() {
        log.debug("Get all invoices for admin - placeholder (invoice-service not integrated)");
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<Map<String, Object>> getInvoiceById(@PathVariable Long id) {
        log.debug("Get invoice {} for admin - placeholder (invoice-service not integrated)", id);
        return ResponseEntity.ok(new HashMap<>());
    }

    @PutMapping("/invoices/{id}/status")
    public ResponseEntity<Map<String, Object>> updateInvoiceStatus(
            @PathVariable Long id,
            @RequestParam String status
    ) {
        log.info("Update invoice {} status to {} - placeholder (invoice-service not integrated)", id, status);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Invoice " + id + " status updated to " + status);
        response.put("invoiceId", id);
        response.put("status", status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/invoices/{id}/pdf")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable Long id) {
        log.debug("Generate PDF for invoice {} - placeholder (invoice-service not integrated)", id);
        // Return empty PDF for now
        return ResponseEntity.ok(new byte[0]);
    }

    // ============== Quotation Management ==============

    @PostMapping("/quotations")
    public ResponseEntity<Map<String, Object>> createQuotation(@RequestBody Map<String, Object> request) {
        log.info("Create new quotation - placeholder (quotation-service not integrated)");
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Quotation created successfully");
        response.put("quotationId", 1L);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/quotations")
    public ResponseEntity<List<Map<String, Object>>> getAllQuotations() {
        log.debug("Get all quotations for admin - placeholder (quotation-service not integrated)");
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/quotations/{id}")
    public ResponseEntity<Map<String, Object>> getQuotationById(@PathVariable Long id) {
        log.debug("Get quotation {} for admin - placeholder (quotation-service not integrated)", id);
        return ResponseEntity.ok(new HashMap<>());
    }

    @PutMapping("/quotations/{id}/status")
    public ResponseEntity<Map<String, Object>> updateQuotationStatus(
            @PathVariable Long id,
            @RequestParam String status
    ) {
        log.info("Update quotation {} status to {} - placeholder (quotation-service not integrated)", id, status);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Quotation " + id + " status updated to " + status);
        response.put("quotationId", id);
        response.put("status", status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/quotations/{id}/pdf")
    public ResponseEntity<byte[]> getQuotationPdf(@PathVariable Long id) {
        log.debug("Generate PDF for quotation {} - placeholder (quotation-service not integrated)", id);
        // Return empty PDF for now
        return ResponseEntity.ok(new byte[0]);
    }

    // ============== Media Management ==============

    @GetMapping("/media")
    public ResponseEntity<List<MediaDTO>> getAllMedia() {
        log.debug("Get all media for admin");
        return ResponseEntity.ok(mediaService.getAllMedia());
    }

    @GetMapping("/media/{id}")
    public ResponseEntity<MediaDTO> getMediaById(@PathVariable Long id) {
        log.debug("Get media {}", id);
        return ResponseEntity.ok(mediaService.getMediaById(id));
    }

    @GetMapping("/media/type/{type}")
    public ResponseEntity<List<MediaDTO>> getMediaByType(@PathVariable String type) {
        log.debug("Get media by type {}", type);
        return ResponseEntity.ok(mediaService.getMediaByType(type));
    }

    @GetMapping("/media/category/{category}")
    public ResponseEntity<List<MediaDTO>> getMediaByCategory(@PathVariable String category) {
        log.debug("Get media by category {}", category);
        return ResponseEntity.ok(mediaService.getMediaByCategory(category));
    }

    @PostMapping("/media")
    public ResponseEntity<MediaDTO> createMedia(@Valid @RequestBody CreateMediaRequest request) {
        log.info("Create new media: {}", request.getTitle());
        return ResponseEntity.ok(mediaService.createMedia(request));
    }

    @PutMapping("/media/{id}")
    public ResponseEntity<MediaDTO> updateMedia(
            @PathVariable Long id,
            @Valid @RequestBody CreateMediaRequest request
    ) {
        log.info("Update media {}", id);
        return ResponseEntity.ok(mediaService.updateMedia(id, request));
    }

    @DeleteMapping("/media/{id}")
    public ResponseEntity<Void> deleteMedia(@PathVariable Long id) {
        log.info("Delete media {}", id);
        mediaService.deleteMedia(id);
        return ResponseEntity.noContent().build();
    }

    // ============== Contact Info Management ==============

    @GetMapping("/contact-info")
    public ResponseEntity<List<ContactInfoDTO>> getAllContactInfo() {
        log.debug("Get all contact info for admin");
        return ResponseEntity.ok(contactInfoService.getAllContactInfo());
    }

    @GetMapping("/contact-info/category/{category}")
    public ResponseEntity<List<ContactInfoDTO>> getContactInfoByCategory(@PathVariable String category) {
        log.debug("Get contact info by category {}", category);
        return ResponseEntity.ok(contactInfoService.getContactInfoByCategory(category));
    }

    @GetMapping("/contact-info/key/{keyName}")
    public ResponseEntity<ContactInfoDTO> getContactInfoByKey(@PathVariable String keyName) {
        log.debug("Get contact info by key {}", keyName);
        return ResponseEntity.ok(contactInfoService.getContactInfoByKey(keyName));
    }

    @PostMapping("/contact-info")
    public ResponseEntity<ContactInfoDTO> createContactInfo(@Valid @RequestBody CreateContactInfoRequest request) {
        log.info("Create new contact info: {}", request.getKeyName());
        return ResponseEntity.ok(contactInfoService.createContactInfo(request));
    }

    @PutMapping("/contact-info/{id}")
    public ResponseEntity<ContactInfoDTO> updateContactInfo(
            @PathVariable Long id,
            @Valid @RequestBody CreateContactInfoRequest request
    ) {
        log.info("Update contact info {}", id);
        return ResponseEntity.ok(contactInfoService.updateContactInfo(id, request));
    }

    @DeleteMapping("/contact-info/{id}")
    public ResponseEntity<Void> deleteContactInfo(@PathVariable Long id) {
        log.info("Delete contact info {}", id);
        contactInfoService.deleteContactInfo(id);
        return ResponseEntity.noContent().build();
    }
}
