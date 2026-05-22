package com.rigoomarine.client.controller;

import com.rigoomarine.client.admin.AdminAuditEntry;
import com.rigoomarine.client.admin.AdminAuditService;
import com.rigoomarine.client.dto.AdminAuditDTO;
import com.rigoomarine.client.dto.AdminPasswordResetRequest;
import com.rigoomarine.client.dto.ClientDTO;
import com.rigoomarine.client.dto.CreateClientRequest;
import com.rigoomarine.client.dto.CreateMediaRequest;
import com.rigoomarine.client.dto.CreateContactInfoRequest;
import com.rigoomarine.client.dto.MediaDTO;
import com.rigoomarine.client.dto.ContactInfoDTO;
import com.rigoomarine.client.service.ClientService;
import com.rigoomarine.client.service.MediaService;
import com.rigoomarine.client.service.ContactInfoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ClientService clientService;
    private final MediaService mediaService;
    private final ContactInfoService contactInfoService;
    private final AdminAuditService adminAuditService;

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
    public ResponseEntity<Page<ClientDTO>> searchUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean verified,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        String[] parts = sort.split(",", 2);
        Sort.Direction dir = parts.length > 1 && parts[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(dir, parts[0]));
        return ResponseEntity.ok(clientService.searchPaged(q, role, verified, pageable));
    }

    @GetMapping("/users/all")
    public ResponseEntity<List<ClientDTO>> getAllUsers() {
        return ResponseEntity.ok(clientService.getAllClients());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<ClientDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(clientService.getClientById(id));
    }

    @PostMapping("/users")
    public ResponseEntity<ClientDTO> createUser(
            @Valid @RequestBody CreateClientRequest body,
            HttpServletRequest httpRequest
    ) {
        ClientDTO created = clientService.createClient(body, true);
        log.info("Admin created user {} with role {}", created.getId(), created.getRole());
        adminAuditService.record(
            actorEmail(), actorId(),
            AdminAuditService.ACTION_USER_CREATE, AdminAuditService.TARGET_USER, created.getId(),
            "{\"email\":" + jsonString(created.getEmail()) + ",\"role\":" + jsonString(created.getRole()) + "}",
            httpRequest.getRemoteAddr());
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ClientDTO> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest
    ) {
        ClientDTO existing = clientService.getClientById(id);
        CreateClientRequest request = new CreateClientRequest();
        request.setName(body.getOrDefault("name", existing.getName()));
        request.setEmail(body.getOrDefault("email", existing.getEmail()));
        request.setPhone(body.getOrDefault("phone", existing.getPhone()));
        request.setAddress(body.getOrDefault("address", existing.getAddress()));
        request.setCompany(body.getOrDefault("company", existing.getCompany()));
        request.setRole(body.getOrDefault("role", existing.getRole()));
        String lang = body.getOrDefault("preferredLanguage", existing.getPreferredLanguage());
        request.setPreferredLanguage(lang);

        ClientDTO updated;
        if (body.containsKey("password") && !body.get("password").isBlank()) {
            request.setPassword(body.get("password"));
            updated = clientService.updateClientWithPassword(id, request);
        } else {
            updated = clientService.updateClient(id, request);
        }
        log.info("Admin updated user {}", id);
        adminAuditService.record(
            actorEmail(), actorId(),
            AdminAuditService.ACTION_USER_UPDATE, AdminAuditService.TARGET_USER, id,
            "{}", httpRequest.getRemoteAddr());
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<ClientDTO> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> roleUpdate,
            HttpServletRequest httpRequest
    ) {
        String newRole = roleUpdate.get("role");

        if (newRole == null || !List.of("CLIENT", "ADMIN", "TECHNICIAN", "TEAM_LEAD", "DELIVERY").contains(newRole)) {
            throw new IllegalArgumentException("Invalid role. Must be CLIENT, ADMIN, TECHNICIAN, TEAM_LEAD, or DELIVERY");
        }

        ClientDTO existing = clientService.getClientById(id);
        String oldRole = existing.getRole();

        CreateClientRequest request = new CreateClientRequest();
        request.setName(existing.getName());
        request.setEmail(existing.getEmail());
        request.setPhone(existing.getPhone());
        request.setAddress(existing.getAddress());
        request.setCompany(existing.getCompany());
        request.setRole(newRole);

        ClientDTO updated = clientService.updateClient(id, request);
        log.info("Updated user {} role to {}", id, newRole);
        adminAuditService.record(
            actorEmail(), actorId(),
            AdminAuditService.ACTION_ROLE_CHANGE, AdminAuditService.TARGET_USER, id,
            "{\"oldRole\":\"" + oldRole + "\",\"newRole\":\"" + newRole + "\"}",
            httpRequest.getRemoteAddr());
        return ResponseEntity.ok(updated);
    }

    /**
     * Admin-initiated password reset. Lost-phone / lost-email scenarios where
     * the user can't self-reset. Goes through the same
     * {@code updateClientWithPassword} path used by self-service, so bcrypt
     * encoding happens exactly once (mirrors the /auth/password fix from
     * earlier in this session). {@code password_changed_at} advances, which
     * invalidates every JWT the target user issued before this call.
     */
    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<ClientDTO> resetUserPassword(
            @PathVariable Long id,
            @Valid @RequestBody AdminPasswordResetRequest body,
            HttpServletRequest httpRequest
    ) {
        ClientDTO existing = clientService.getClientById(id);
        CreateClientRequest request = new CreateClientRequest();
        request.setName(existing.getName());
        request.setEmail(existing.getEmail());
        request.setPhone(existing.getPhone());
        request.setAddress(existing.getAddress());
        request.setCompany(existing.getCompany());
        request.setRole(existing.getRole());
        // RAW password. ClientService.updateClientWithPassword is the sole encoder.
        request.setPassword(body.getNewPassword());

        ClientDTO updated = clientService.updateClientWithPassword(id, request);
        log.info("Admin-reset password for user {}", id);
        String details = body.getReason() == null || body.getReason().isBlank()
            ? "{}"
            : "{\"reason\":" + jsonString(body.getReason()) + "}";
        adminAuditService.record(
            actorEmail(), actorId(),
            AdminAuditService.ACTION_PASSWORD_RESET, AdminAuditService.TARGET_USER, id,
            details, httpRequest.getRemoteAddr());
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
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, HttpServletRequest httpRequest) {
        clientService.deleteClient(id);
        log.info("Deleted user {}", id);
        adminAuditService.record(
            actorEmail(), actorId(),
            AdminAuditService.ACTION_USER_DELETE, AdminAuditService.TARGET_USER, id,
            "{}", httpRequest.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    /**
     * Recent admin actions for the ops dashboard. Optional {@code action}
     * filter (e.g. {@code ?action=PASSWORD_RESET}). Default limit 100, max 500.
     */
    @GetMapping("/audit")
    public ResponseEntity<List<AdminAuditDTO>> recentAudit(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String action
    ) {
        List<AdminAuditEntry> rows = adminAuditService.recent(limit, action);
        return ResponseEntity.ok(rows.stream().map(AdminAuditDTO::from).collect(Collectors.toList()));
    }

    /** JWT principal's email from the SecurityContext for audit attribution. */
    private static String actorEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "anonymous";
        Object principal = auth.getPrincipal();
        if (principal instanceof com.rigoomarine.common.security.AuthenticatedUser u) {
            return u.getEmail();
        }
        return String.valueOf(principal);
    }

    private static Long actorId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof com.rigoomarine.common.security.AuthenticatedUser u) {
            return u.getClientId();
        }
        return null;
    }

    /** Minimal JSON-string escaping for the audit {@code details} blob. */
    private static String jsonString(String raw) {
        StringBuilder sb = new StringBuilder(raw.length() + 2);
        sb.append('"');
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            switch (c) {
                case '"', '\\' -> sb.append('\\').append(c);
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        sb.append('"');
        return sb.toString();
    }

    // Note: previous /admin/orders, /admin/services, /admin/invoices, /admin/quotations endpoints
    // were placeholders that returned empty lists. They've been removed — the frontend now calls
    // the underlying microservices directly via the gateway (/api/work-orders, /api/services, etc.).

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
