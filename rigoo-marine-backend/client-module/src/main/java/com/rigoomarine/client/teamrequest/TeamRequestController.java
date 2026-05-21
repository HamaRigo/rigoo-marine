package com.rigoomarine.client.teamrequest;

import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.common.security.SecurityUtils;
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

        String callerEmail = resolveEmail(authentication);
        TeamRequestDTO dto = service.create(callerEmail, contactPhone, category,
                                            description, location, whatsapp, files);
        return ResponseEntity.ok(dto);
    }

    // ── Client: own requests ──────────────────────────────────────────────────

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

    // ── Technician: view + respond to assigned requests ───────────────────────

    @GetMapping("/api/team-requests/assigned")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'TEAM_LEAD', 'ADMIN')")
    public ResponseEntity<Page<TeamRequestDTO>> myAssigned(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Long callerClientId = SecurityUtils.currentUser()
            .map(AuthenticatedUser::getClientId)
            .orElse(null);
        if (callerClientId == null) return ResponseEntity.status(401).build();

        PageRequest pr = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(service.listAssigned(callerClientId, pr));
    }

    @PatchMapping("/api/team-requests/{id}/respond")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'TEAM_LEAD')")
    public ResponseEntity<TeamRequestDTO> respond(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String statusStr = body.get("status");
        if (statusStr == null) return ResponseEntity.badRequest().build();

        TeamRequestStatus newStatus;
        try { newStatus = TeamRequestStatus.valueOf(statusStr.toUpperCase()); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().build(); }

        Long callerClientId = SecurityUtils.currentUser()
            .map(AuthenticatedUser::getClientId)
            .orElse(null);
        if (callerClientId == null) return ResponseEntity.status(401).build();

        try {
            return ResponseEntity.ok(
                service.respondAsAssigned(id, callerClientId, newStatus, body.get("note")));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(403).build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ── Admin + Team Lead: list, assign, update status ────────────────────────

    @GetMapping("/api/admin/team-requests")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
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

    @PatchMapping("/api/admin/team-requests/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public ResponseEntity<TeamRequestDTO> assign(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body) {

        Long technicianId = body.get("technicianId");
        if (technicianId == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(service.assign(id, technicianId));
    }

    @GetMapping("/api/admin/team-requests/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public ResponseEntity<Map<String, Long>> stats() {
        return ResponseEntity.ok(Map.of("pending", service.countPending()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static String resolveEmail(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        return principal instanceof String s ? s : null;
    }
}
