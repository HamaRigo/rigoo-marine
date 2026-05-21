package com.rigoomarine.vessel.controller;

import com.rigoomarine.vessel.dto.VesselDTO;
import com.rigoomarine.vessel.dto.CreateVesselRequest;
import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.vessel.service.VesselService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/vessels")
@RequiredArgsConstructor
public class VesselController {

    private final VesselService vesselService;

    @PostMapping
    public ResponseEntity<VesselDTO> createVessel(@Valid @RequestBody CreateVesselRequest request) {
        return ResponseEntity.ok(vesselService.createVessel(request));
    }

    /**
     * Returns the caller's vessels. clientId is derived from the JWT — the previous
     * {@code ?clientId=} query parameter is dropped to prevent identity spoofing.
     */
    @GetMapping("/my")
    public ResponseEntity<List<VesselDTO>> getMyVessels() {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        return ResponseEntity.ok(vesselService.getVesselsByClientId(clientId));
    }

    @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN','TEAM_LEAD')")
    @GetMapping
    public ResponseEntity<List<VesselDTO>> getAllVessels() {
        return ResponseEntity.ok(vesselService.getAllVessels());
    }

    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD') or @vesselSecurity.canAccess(#id)")
    @GetMapping("/{id}")
    public ResponseEntity<VesselDTO> getVesselById(@PathVariable Long id) {
        return ResponseEntity.ok(vesselService.getVesselById(id));
    }

    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD') or @vesselSecurity.canAccess(#id)")
    @PutMapping("/{id}")
    public ResponseEntity<VesselDTO> updateVessel(
        @PathVariable Long id,
        @Valid @RequestBody CreateVesselRequest request
    ) {
        return ResponseEntity.ok(vesselService.updateVessel(id, request));
    }

    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD') or @vesselSecurity.canAccess(#id)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVessel(@PathVariable Long id) {
        vesselService.deleteVessel(id);
        return ResponseEntity.noContent().build();
    }
}
