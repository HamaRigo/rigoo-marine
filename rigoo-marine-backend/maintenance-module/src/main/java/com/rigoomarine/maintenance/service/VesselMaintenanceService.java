package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.dto.*;
import com.rigoomarine.maintenance.entity.ServiceScheduleItem;
import com.rigoomarine.maintenance.entity.Urgency;
import com.rigoomarine.maintenance.exception.VesselLookupUnavailableException;
import com.rigoomarine.maintenance.repository.ServiceHistoryRecordRepository;
import com.rigoomarine.maintenance.repository.ServiceScheduleItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Read-side aggregator backing the vessel-detail page and the dashboard widget.
 * Hits two DB tables and one vessel-service endpoint per request; falls back to
 * a degraded payload (engineHoursUnavailable=true) if vessel-service is down.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class VesselMaintenanceService {

    private static final int RECENT_HISTORY_LIMIT = 20;

    private final ServiceHistoryRecordRepository historyRepo;
    private final ServiceScheduleItemRepository scheduleRepo;
    private final ServiceHistoryService historyService;
    private final ServiceScheduleService scheduleService;
    private final VesselClient vesselClient;

    public VesselMaintenanceSummaryDTO buildDossier(Long vesselId) {
        EngineHoursReading reading = fetchEngineHours(vesselId);

        List<ServiceHistoryDTO> history = historyRepo
            .search(vesselId, null, null, null, PageRequest.of(0, RECENT_HISTORY_LIMIT))
            .map(historyService::toDTO)
            .getContent();

        List<ServiceScheduleDTO> schedule = scheduleRepo.findByVesselId(vesselId).stream()
            .map(item -> scheduleService.toDTO(item, reading.hours))
            .toList();

        List<UpcomingServiceDTO> overdue = schedule.stream()
            .filter(s -> s.getUrgency() == Urgency.OVERDUE)
            .map(s -> toUpcoming(s, vesselId, null))
            .toList();

        List<UpcomingServiceDTO> dueSoon = schedule.stream()
            .filter(s -> s.getUrgency() == Urgency.DUE_SOON)
            .map(s -> toUpcoming(s, vesselId, null))
            .toList();

        return VesselMaintenanceSummaryDTO.builder()
            .vesselId(vesselId)
            .currentEngineHours(reading.hours)
            .engineHoursUpdatedAt(reading.updatedAt)
            .engineHoursUnavailable(reading.unavailable)
            .recentHistory(history)
            .schedule(schedule)
            .overdue(overdue)
            .dueSoon(dueSoon)
            .build();
    }

    /**
     * Dashboard widget: every active schedule across the client's vessels,
     * narrowed to {@code OVERDUE} + {@code DUE_SOON}, ordered by urgency then date.
     */
    public List<UpcomingServiceDTO> upcomingForClient(Long clientId) {
        List<ServiceScheduleItem> items = scheduleRepo.findByClientId(clientId);
        return items.stream()
            // Vessel name resolution is intentionally null here — the widget
            // either renders just the type+date (cheap), or the frontend has
            // already cached vessels via vesselApi.getMyVessels.
            .map(item -> {
                ServiceScheduleDTO dto = scheduleService.toDTO(item, null);
                return toUpcoming(dto, item.getVesselId(), null);
            })
            .filter(u -> u.getUrgency() == Urgency.OVERDUE || u.getUrgency() == Urgency.DUE_SOON)
            .sorted((a, b) -> {
                int byUrg = a.getUrgency().compareTo(b.getUrgency()); // OVERDUE < DUE_SOON
                if (byUrg != 0) return byUrg;
                if (a.getNextDueDate() == null && b.getNextDueDate() == null) return 0;
                if (a.getNextDueDate() == null) return 1;
                if (b.getNextDueDate() == null) return -1;
                return a.getNextDueDate().compareTo(b.getNextDueDate());
            })
            .toList();
    }

    private UpcomingServiceDTO toUpcoming(ServiceScheduleDTO s, Long vesselId, String vesselName) {
        return UpcomingServiceDTO.builder()
            .vesselId(vesselId)
            .vesselName(vesselName)
            .serviceType(s.getServiceType())
            .nextDueDate(s.getNextDueDate())
            .nextDueHours(s.getNextDueHours())
            .daysUntilDue(s.getDaysUntilDue())
            .hoursUntilDue(s.getHoursUntilDue())
            .urgency(s.getUrgency())
            .build();
    }

    public EngineHoursReading fetchEngineHours(Long vesselId) {
        try {
            Map<String, Object> resp = vesselClient.getEngineHours(vesselId);
            if (resp == null) return new EngineHoursReading(null, null, false);
            BigDecimal hours = resp.get("hours") == null ? null : new BigDecimal(resp.get("hours").toString());
            Instant updatedAt = resp.get("updatedAt") == null
                ? null
                : Instant.parse(resp.get("updatedAt").toString());
            return new EngineHoursReading(hours, updatedAt, false);
        } catch (VesselLookupUnavailableException ex) {
            log.warn("engineHours unavailable for dossier vessel={}: {}", vesselId, ex.getMessage());
            return new EngineHoursReading(null, null, true);
        }
    }

    public record EngineHoursReading(BigDecimal hours, Instant updatedAt, boolean unavailable) {}
}
