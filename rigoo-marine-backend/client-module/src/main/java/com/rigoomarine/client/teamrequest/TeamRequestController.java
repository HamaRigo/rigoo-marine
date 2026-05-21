package com.rigoomarine.client.teamrequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class TeamRequestController {

    private final TeamRequestService service;

    // ── Public: submit ────────────────────────────────────────────────────────

    /**
     * Open to guests and authenticated clients. The JWT filter sets the principal
     * as the caller's email (String) when a valid token is present.
     *
     * For authenticated users, contactPhone is IGNORED and replaced with the phone
     * stored on their account — preventing callers from spoofing another user's phone
     * to poison the duplicate-pending guard.
     */
    @PostMapping("/api/team-requests")
    public ResponseEntity<TeamRequestDTO> create(
            @RequestParam("category")            String category,
            @RequestParam("description")         String description,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam("contactPhone")         String contactPhone,
            @RequestParam(value = "whatsapp", defaultValue = "false") boolean whatsapp,
            @RequestParam(value = "files",    required = false) List<MultipartFile> files,
            Authentication authentication) {

        if (category == null || category.isBlank())
            return ResponseEntity.badRequest().build();
        if (description == null || description.isBlank())
            return ResponseEntity.badRequest().build();
        if (contactPhone == null || contactPhone.isBlank())
            return ResponseEntity.badRequest().build();

        // JWT filter puts the caller's email (String) as the principal.
        // We resolve it in the service to get clientId and canonical phone.
        String callerEmail = resolveEmail(authentication);

        TeamRequestDTO dto = service.create(callerEmail, contactPhone, category,
                                            description, location, whatsapp, files);
        return ResponseEntity.ok(dto);
    }

    // ── Client: own requests ──────────────────────────────────────────────────

    /**
     * Returns the authenticated caller's own team requests (all statuses).
     * Matches on both clientId and contactPhone so pre-login guest submissions
     * surface after the guest creates an account with the same phone number.
     */
    @GetMapping("/api/clients/me/team-requests")
    public ResponseEntity<Page<TeamRequestDTO>> myRequests(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {

        String callerEmail = resolveEmail(authentication);
        if (callerEmail == null) return ResponseEntity.status(401).build();

        PageRequest pr = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(service.listForCaller(callerEmail, pr));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @GetMapping("/api/admin/team-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<TeamRequestDTO>> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        TeamRequestStatus filter = null;
        if (status != null && !status.isBlank()) {
            try { filter = TeamRequestStatus.valueOf(status.toUpperCase()); }
            catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        PageRequest pr = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(service.list(filter, pr));
    }

    @PatchMapping("/api/admin/team-requests/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TeamRequestDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String statusStr = body.get("status");
        if (statusStr == null) return ResponseEntity.badRequest().build();

        TeamRequestStatus newStatus;
        try { newStatus = TeamRequestStatus.valueOf(statusStr.toUpperCase()); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().build(); }

        return ResponseEntity.ok(service.updateStatus(id, newStatus, body.get("adminNotes")));
    }

    @GetMapping("/api/admin/team-requests/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> stats() {
        return ResponseEntity.ok(Map.of("pending", service.countPending()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static String resolveEmail(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        // JWT filter stores the subject (email) as a raw String principal.
        return principal instanceof String s ? s : null;
    }
}
