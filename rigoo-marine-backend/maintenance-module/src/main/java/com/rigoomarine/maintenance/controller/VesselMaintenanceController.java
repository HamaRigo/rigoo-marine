package com.rigoomarine.maintenance.controller;

import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.dto.EngineHoursDTO;
import com.rigoomarine.maintenance.dto.UpcomingServiceDTO;
import com.rigoomarine.maintenance.dto.UpdateEngineHoursRequest;
import com.rigoomarine.maintenance.dto.VesselMaintenanceSummaryDTO;
import com.rigoomarine.maintenance.service.MaintenanceSecurity;
import com.rigoomarine.maintenance.service.VesselMaintenanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/maintenance")
@RequiredArgsConstructor
public class VesselMaintenanceController {

    private final VesselMaintenanceService dossierService;
    private final MaintenanceSecurity security;
    private final VesselClient vesselClient;

    @GetMapping("/vessels/{vesselId}/dossier")
    public ResponseEntity<VesselMaintenanceSummaryDTO> dossier(@PathVariable Long vesselId) {
        security.assertCanActOnVessel(vesselId);
        return ResponseEntity.ok(dossierService.buildDossier(vesselId));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<UpcomingServiceDTO>> upcoming() {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        return ResponseEntity.ok(dossierService.upcomingForClient(clientId));
    }

    @PatchMapping("/vessels/{vesselId}/engine-hours")
    public ResponseEntity<EngineHoursDTO> updateEngineHours(
            @PathVariable Long vesselId,
            @Valid @RequestBody UpdateEngineHoursRequest request
    ) {
        security.assertCanActOnVessel(vesselId);
        vesselClient.updateEngineHours(vesselId, request.getHours());
        return ResponseEntity.ok(EngineHoursDTO.builder()
            .vesselId(vesselId)
            .currentEngineHours(request.getHours())
            .engineHoursUpdatedAt(Instant.now())
            .build());
    }
}
