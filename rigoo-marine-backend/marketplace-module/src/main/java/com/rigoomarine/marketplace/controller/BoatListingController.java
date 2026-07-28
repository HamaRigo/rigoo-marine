package com.rigoomarine.marketplace.controller;

import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.marketplace.dto.BoatListingDTO;
import com.rigoomarine.marketplace.service.BoatListingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/listings")
@RequiredArgsConstructor
public class BoatListingController {

    private final BoatListingService service;

    /**
     * Public gallery search. Drafts/archived hidden unless caller is ADMIN and passes adminStatus.
     */
    @GetMapping
    public ResponseEntity<Page<BoatListingDTO>> search(
            @RequestParam(required = false) String mode,            // BUY | RENT
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String boatType,
            @RequestParam(required = false) BigDecimal lengthMin,
            @RequestParam(required = false) BigDecimal lengthMax,
            @RequestParam(required = false) Integer yearMin,
            @RequestParam(required = false) Integer yearMax,
            @RequestParam(required = false) BigDecimal priceMin,
            @RequestParam(required = false) BigDecimal priceMax,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String adminStatus,     // ADMIN-only filter; ignored for public callers
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        Pageable pageable = pageable(page, size, sort);
        boolean canUseAdminStatus = principal != null
                && (principal.hasRole("ADMIN") || principal.hasRole("TEAM_LEAD"));
        return ResponseEntity.ok(service.search(
                mode, q, boatType, lengthMin, lengthMax, yearMin, yearMax,
                priceMin, priceMax, location, adminStatus, canUseAdminStatus, pageable));
    }

    @GetMapping("/boat-types")
    public ResponseEntity<List<String>> getBoatTypes() {
        return ResponseEntity.ok(service.getDistinctBoatTypes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BoatListingDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/by-slug/{slug}")
    public ResponseEntity<BoatListingDTO> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(service.getBySlug(slug));
    }

    @PreAuthorize("hasAnyRole('CLIENT','ADMIN','TEAM_LEAD')")
    @GetMapping("/my")
    public ResponseEntity<List<BoatListingDTO>> getMyListings(
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(service.getMyListings(principal.getClientId()));
    }

    @PreAuthorize("hasAnyRole('CLIENT','ADMIN','TEAM_LEAD')")
    @PostMapping("/submit")
    public ResponseEntity<BoatListingDTO> submit(
            @RequestBody BoatListingDTO dto,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(service.submit(dto, principal.getClientId()));
    }

    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    @PutMapping("/{id}/approve")
    public ResponseEntity<BoatListingDTO> approve(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        BigDecimal pct = body.get("companyGainPct") == null ? null
                : new BigDecimal(body.get("companyGainPct").toString());
        String role = principal.hasRole("ADMIN") ? "ADMIN" : "TEAM_LEAD";
        return ResponseEntity.ok(service.approve(id, pct, principal.getEmail(), role));
    }

    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    @PutMapping("/{id}/reject")
    public ResponseEntity<BoatListingDTO> reject(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        String reason = body != null && body.get("reason") != null ? body.get("reason").toString() : null;
        String role = principal.hasRole("ADMIN") ? "ADMIN" : "TEAM_LEAD";
        return ResponseEntity.ok(service.reject(id, reason, principal.getEmail(), role));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<BoatListingDTO> create(@Valid @RequestBody BoatListingDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<BoatListingDTO> update(@PathVariable Long id, @Valid @RequestBody BoatListingDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    private static Pageable pageable(int page, int size, String sort) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        String[] parts = sort.split(",", 2);
        Sort.Direction dir = parts.length > 1 && parts[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(Math.max(page, 0), safeSize, Sort.by(dir, parts[0]));
    }
}
