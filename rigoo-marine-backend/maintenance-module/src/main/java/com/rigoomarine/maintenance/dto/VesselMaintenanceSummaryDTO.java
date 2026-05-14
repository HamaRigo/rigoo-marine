package com.rigoomarine.maintenance.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Single payload backing the vessel-detail page (Info / History / Schedule
 * tabs share this object — no over-fetching). {@code engineHoursUnavailable}
 * is the explicit degradation flag when vessel-service is unreachable.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VesselMaintenanceSummaryDTO {
    private Long vesselId;
    private BigDecimal currentEngineHours;
    private Instant engineHoursUpdatedAt;
    private boolean engineHoursUnavailable;
    private List<ServiceHistoryDTO> recentHistory;
    private List<ServiceScheduleDTO> schedule;
    private List<UpcomingServiceDTO> overdue;
    private List<UpcomingServiceDTO> dueSoon;
}
