package com.rigoomarine.maintenance.controller;

import com.rigoomarine.maintenance.dto.VesselInspectionDTO;
import com.rigoomarine.maintenance.entity.VesselInspection;
import com.rigoomarine.maintenance.service.VesselInspectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/vessel-inspections")
@RequiredArgsConstructor
public class VesselInspectionController {

    private final VesselInspectionService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD','TECHNICIAN')")
    public ResponseEntity<Page<VesselInspectionDTO>> list(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) Long vesselId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("inspectionDate").descending());
        return ResponseEntity.ok(service.search(clientId, vesselId, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD','TECHNICIAN')")
    public ResponseEntity<VesselInspectionDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    public ResponseEntity<VesselInspectionDTO> create(@RequestBody VesselInspection body) {
        return ResponseEntity.status(201).body(service.create(body));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD','TECHNICIAN')")
    public ResponseEntity<VesselInspectionDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        VesselInspection.InspectionStatus status =
            VesselInspection.InspectionStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(service.updateStatus(id, status, body.get("findings")));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
