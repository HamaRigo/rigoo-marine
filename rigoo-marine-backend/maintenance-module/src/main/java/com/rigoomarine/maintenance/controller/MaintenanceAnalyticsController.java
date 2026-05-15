package com.rigoomarine.maintenance.controller;

import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.maintenance.dto.MaintenanceCostSummaryDTO;
import com.rigoomarine.maintenance.service.MaintenanceAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Read-only analytics for the maintenance dashboard. ClientId is derived
 * from the JWT — admins call the admin endpoints (separate controller)
 * instead of overriding clientId here.
 */
@RestController
@RequestMapping("/api/maintenance/analytics")
@RequiredArgsConstructor
public class MaintenanceAnalyticsController {

    private final MaintenanceAnalyticsService analyticsService;

    /**
     * @param year optional; defaults to the current year in the JVM's
     *             default timezone (the Asia/Qatar Clock bean configured
     *             in SchedulingConfig — same anchor the rest of the
     *             module uses).
     */
    @GetMapping("/cost")
    public ResponseEntity<MaintenanceCostSummaryDTO> getCostSummary(
            @RequestParam(required = false) Integer year
    ) {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        int targetYear = year != null ? year : LocalDate.now().getYear();
        return ResponseEntity.ok(analyticsService.getCostSummary(clientId, targetYear));
    }
}
