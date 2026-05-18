package com.rigoomarine.client.teamrequest;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
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
     * Open to guests and authenticated clients. Auth is optional — if a valid
     * JWT is present the filter sets a principal; controller uses it to attach
     * the clientId. Guests pass their phone in the form body.
     */
    @PostMapping("/api/team-requests")
    public ResponseEntity<TeamRequestDTO> create(
            @RequestParam("category")            String category,
            @RequestParam("description")         String description,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam("contactPhone")         String contactPhone,
            @RequestParam(value = "whatsapp", defaultValue = "false") boolean whatsapp,
            @RequestParam(value = "files",    required = false) List<MultipartFile> files,
            @AuthenticationPrincipal User principal) {

        if (category == null || category.isBlank())
            return ResponseEntity.badRequest().build();
        if (description == null || description.isBlank())
            return ResponseEntity.badRequest().build();
        if (contactPhone == null || contactPhone.isBlank())
            return ResponseEntity.badRequest().build();

        Long clientId = null;
        if (principal != null) {
            try { clientId = Long.parseLong(principal.getUsername()); }
            catch (NumberFormatException ignored) {}
        }

        TeamRequestDTO dto = service.create(clientId, contactPhone, category,
                                            description, location, whatsapp, files);
        return ResponseEntity.ok(dto);
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
}
