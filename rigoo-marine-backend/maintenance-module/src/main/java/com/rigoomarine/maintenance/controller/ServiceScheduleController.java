package com.rigoomarine.maintenance.controller;

import com.rigoomarine.maintenance.dto.ServiceScheduleDTO;
import com.rigoomarine.maintenance.dto.SnoozeRequest;
import com.rigoomarine.maintenance.dto.UpsertScheduleRequest;
import com.rigoomarine.maintenance.entity.ScheduleStatus;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.service.MaintenanceSecurity;
import com.rigoomarine.maintenance.service.ServiceScheduleService;
import com.rigoomarine.maintenance.service.VesselMaintenanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/maintenance")
@RequiredArgsConstructor
public class ServiceScheduleController {

    private final ServiceScheduleService scheduleService;
    private final VesselMaintenanceService dossierService;
    private final MaintenanceSecurity security;

    @GetMapping("/vessels/{vesselId}/schedule")
    public ResponseEntity<List<ServiceScheduleDTO>> list(@PathVariable Long vesselId) {
        security.assertCanActOnVessel(vesselId);
        var reading = dossierService.fetchEngineHours(vesselId);
        return ResponseEntity.ok(scheduleService.listForVessel(vesselId, reading.hours()));
    }

    @PutMapping("/vessels/{vesselId}/schedule/{type}")
    public ResponseEntity<ServiceScheduleDTO> upsert(
            @PathVariable Long vesselId,
            @PathVariable ServiceType type,
            @Valid @RequestBody UpsertScheduleRequest request
    ) {
        Long clientId = security.assertCanActOnVessel(vesselId);
        var reading = dossierService.fetchEngineHours(vesselId);
        return ResponseEntity.ok(scheduleService.upsert(vesselId, clientId, type, request, reading.hours()));
    }

    @PostMapping("/vessels/{vesselId}/schedule/{type}/snooze")
    public ResponseEntity<ServiceScheduleDTO> snooze(
            @PathVariable Long vesselId,
            @PathVariable ServiceType type,
            @Valid @RequestBody SnoozeRequest request
    ) {
        security.assertCanActOnVessel(vesselId);
        var reading = dossierService.fetchEngineHours(vesselId);
        return ResponseEntity.ok(scheduleService.snooze(vesselId, type, request.getDays(), reading.hours()));
    }

    @PostMapping("/vessels/{vesselId}/schedule/{type}/pause")
    public ResponseEntity<ServiceScheduleDTO> pause(@PathVariable Long vesselId, @PathVariable ServiceType type) {
        security.assertCanActOnVessel(vesselId);
        var reading = dossierService.fetchEngineHours(vesselId);
        return ResponseEntity.ok(scheduleService.setStatus(vesselId, type, ScheduleStatus.PAUSED, reading.hours()));
    }

    @PostMapping("/vessels/{vesselId}/schedule/{type}/resume")
    public ResponseEntity<ServiceScheduleDTO> resume(@PathVariable Long vesselId, @PathVariable ServiceType type) {
        security.assertCanActOnVessel(vesselId);
        var reading = dossierService.fetchEngineHours(vesselId);
        return ResponseEntity.ok(scheduleService.setStatus(vesselId, type, ScheduleStatus.ACTIVE, reading.hours()));
    }
}
