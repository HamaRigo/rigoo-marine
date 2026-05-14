package com.rigoomarine.maintenance.controller;

import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.dto.EngineHoursDTO;
import com.rigoomarine.maintenance.dto.UpcomingServiceDTO;
import com.rigoomarine.maintenance.dto.UpdateEngineHoursRequest;
import com.rigoomarine.maintenance.dto.VesselMaintenanceSummaryDTO;
import com.rigoomarine.maintenance.service.MaintenanceDossierPdfRenderer;
import com.rigoomarine.maintenance.service.MaintenanceSecurity;
import com.rigoomarine.maintenance.service.VesselMaintenanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/maintenance")
@RequiredArgsConstructor
public class VesselMaintenanceController {

    private final VesselMaintenanceService dossierService;
    private final MaintenanceSecurity security;
    private final VesselClient vesselClient;
    private final MaintenanceDossierPdfRenderer pdfRenderer;

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

    /**
     * Printable maintenance report — history + schedule + engine hours on a
     * single A4 PDF. Useful when handing a vessel over (resale, warranty,
     * insurance). Same ownership rules as the dossier endpoint: CLIENT must
     * own; ADMIN/TECHNICIAN bypass.
     *
     * @param locale optional — "en" (default) or "ar". The renderer's label
     *               set switches; full Arabic glyph rendering needs a
     *               bundled font (see {@link MaintenanceDossierPdfRenderer}).
     */
    @GetMapping("/vessels/{vesselId}/dossier.pdf")
    public ResponseEntity<byte[]> downloadDossierPdf(
            @PathVariable Long vesselId,
            @RequestParam(required = false, defaultValue = "en") String locale
    ) {
        security.assertCanActOnVessel(vesselId);

        VesselMaintenanceSummaryDTO dossier = dossierService.buildDossier(vesselId);
        String vesselName = resolveVesselName(vesselId);
        byte[] pdf = pdfRenderer.render(dossier, vesselName, locale);

        String filename = "vessel-" + vesselId + "-maintenance.pdf";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(org.springframework.http.ContentDisposition
            .attachment().filename(filename).build());
        headers.setContentLength(pdf.length);
        return new ResponseEntity<>(pdf, headers, org.springframework.http.HttpStatus.OK);
    }

    /**
     * Best-effort vessel name for the PDF header. Falls back to a numeric
     * placeholder if vessel-service is unreachable — the report is still
     * useful even without the name.
     */
    private String resolveVesselName(Long vesselId) {
        try {
            Map<String, Object> resp = vesselClient.getEngineHours(vesselId);
            // The internal engine-hours endpoint returns vesselId but not name.
            // For now, no name resolution — the PDF will render with the
            // numeric id. Fully populated when vessel-service exposes a name
            // accessor (separate follow-up).
            return resp == null ? null : null;
        } catch (Exception ignored) {
            return null;
        }
    }
}
