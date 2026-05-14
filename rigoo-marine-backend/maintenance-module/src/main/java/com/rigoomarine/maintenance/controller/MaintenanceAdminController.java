package com.rigoomarine.maintenance.controller;

import com.rigoomarine.maintenance.dto.VesselMaintenanceSummaryDTO;
import com.rigoomarine.maintenance.service.VesselMaintenanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin read-only access to any vessel's maintenance dossier. No write paths
 * here — admins use the regular client endpoints with ADMIN role short-circuiting
 * the ownership check in {@link com.rigoomarine.maintenance.service.MaintenanceSecurity}.
 */
@RestController
@RequestMapping("/api/maintenance/admin")
@RequiredArgsConstructor
public class MaintenanceAdminController {

    private final VesselMaintenanceService dossierService;

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/vessels/{vesselId}/dossier")
    public ResponseEntity<VesselMaintenanceSummaryDTO> dossier(@PathVariable Long vesselId) {
        return ResponseEntity.ok(dossierService.buildDossier(vesselId));
    }
}
