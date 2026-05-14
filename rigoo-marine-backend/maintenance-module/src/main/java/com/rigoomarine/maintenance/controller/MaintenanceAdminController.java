package com.rigoomarine.maintenance.controller;

import com.rigoomarine.maintenance.dto.AdminUpcomingDTO;
import com.rigoomarine.maintenance.dto.VesselMaintenanceSummaryDTO;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.service.AdminMaintenanceService;
import com.rigoomarine.maintenance.service.VesselMaintenanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin read-only access to maintenance state. No write paths here — admins
 * use the regular client endpoints with ADMIN role short-circuiting the
 * ownership check in {@link com.rigoomarine.maintenance.service.MaintenanceSecurity}.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code GET /vessels/{id}/dossier} — single-vessel deep view (already existed).</li>
 *   <li>{@code GET /upcoming} — cross-client list of OVERDUE + DUE_SOON items
 *       for the proactive-outreach inbox, with urgency / serviceType / q filters.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/maintenance/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class MaintenanceAdminController {

    private final VesselMaintenanceService dossierService;
    private final AdminMaintenanceService adminService;

    @GetMapping("/vessels/{vesselId}/dossier")
    public ResponseEntity<VesselMaintenanceSummaryDTO> dossier(@PathVariable Long vesselId) {
        return ResponseEntity.ok(dossierService.buildDossier(vesselId));
    }

    /**
     * @param urgency optional — "OVERDUE" or "DUE_SOON". Omitting returns both.
     * @param type    optional — narrow to a single ServiceType.
     * @param q       optional — free-text match on client name/email and vessel name.
     */
    @GetMapping("/upcoming")
    public ResponseEntity<List<AdminUpcomingDTO>> upcoming(
            @RequestParam(required = false) String urgency,
            @RequestParam(required = false) ServiceType type,
            @RequestParam(required = false) String q
    ) {
        return ResponseEntity.ok(adminService.findUpcoming(urgency, type, q));
    }
}
