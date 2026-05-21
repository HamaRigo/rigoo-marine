package com.rigoomarine.vessel.controller;

import com.rigoomarine.vessel.dto.CreateFuelLogRequest;
import com.rigoomarine.vessel.dto.FuelAnalyticsDTO;
import com.rigoomarine.vessel.dto.FuelLogDTO;
import com.rigoomarine.vessel.service.FuelLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.time.Year;

/**
 * Fuel consumption log per vessel.
 * All endpoints are secured by vessel ownership (checked inside the service).
 */
@RestController
@RequiredArgsConstructor
public class FuelLogController {

    private final FuelLogService fuelLogService;

    @GetMapping("/api/vessels/{vesselId}/fuel-logs")
    public ResponseEntity<Page<FuelLogDTO>> listLogs(
        @PathVariable Long vesselId,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pr = PageRequest.of(page, size,
            Sort.by(Sort.Direction.DESC, "logDate", "id"));
        return ResponseEntity.ok(fuelLogService.listForVessel(vesselId, pr));
    }

    @PostMapping("/api/vessels/{vesselId}/fuel-logs")
    public ResponseEntity<FuelLogDTO> addLog(
        @PathVariable Long vesselId,
        @Valid @RequestBody CreateFuelLogRequest request
    ) {
        FuelLogDTO created = fuelLogService.addLog(vesselId, request);
        URI location = URI.create("/api/vessels/" + vesselId + "/fuel-logs/" + created.getId());
        return ResponseEntity.created(location).body(created);
    }

    @DeleteMapping("/api/vessels/fuel-logs/{logId}")
    public ResponseEntity<Void> deleteLog(@PathVariable Long logId) {
        fuelLogService.deleteLog(logId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/vessels/{vesselId}/fuel-logs/analytics")
    public ResponseEntity<FuelAnalyticsDTO> analytics(
        @PathVariable Long vesselId,
        @RequestParam(defaultValue = "0") int year
    ) {
        int resolvedYear = year > 0 ? year : Year.now().getValue();
        return ResponseEntity.ok(fuelLogService.analytics(vesselId, resolvedYear));
    }
}
