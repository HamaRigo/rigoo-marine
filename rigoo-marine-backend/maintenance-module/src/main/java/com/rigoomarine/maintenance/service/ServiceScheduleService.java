package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.dto.ServiceScheduleDTO;
import com.rigoomarine.maintenance.dto.UpsertScheduleRequest;
import com.rigoomarine.maintenance.entity.ScheduleStatus;
import com.rigoomarine.maintenance.entity.ServiceScheduleItem;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.entity.Urgency;
import com.rigoomarine.maintenance.exception.ServiceScheduleNotFoundException;
import com.rigoomarine.maintenance.repository.ServiceHistoryRecordRepository;
import com.rigoomarine.maintenance.repository.ServiceScheduleItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Schedule lifecycle: upsert, snooze, pause/resume, and the post-history-write
 * "advance" used by {@link ServiceHistoryService}. The advance logic is the
 * heart of automated rescheduling — when a client logs an OIL_CHANGE the next
 * due-date is recomputed in the same transaction, so the dossier widget refreshes
 * the moment the dialog closes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ServiceScheduleService {

    private final ServiceScheduleItemRepository scheduleRepo;
    private final ServiceHistoryRecordRepository historyRepo;
    private final Clock clock;

    @Value("${app.maintenance.reminders.look-ahead-days:14}")
    private int lookAheadDays;

    @Value("${app.maintenance.reminders.hours-tolerance:10}")
    private int hoursTolerance;

    @Transactional(readOnly = true)
    public List<ServiceScheduleDTO> listForVessel(Long vesselId, BigDecimal currentEngineHours) {
        return scheduleRepo.findByVesselId(vesselId).stream()
            .map(item -> toDTO(item, currentEngineHours))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceScheduleItem> findActiveByClient(Long clientId) {
        return scheduleRepo.findByClientId(clientId);
    }

    public ServiceScheduleDTO upsert(Long vesselId, Long clientId, ServiceType type, UpsertScheduleRequest req,
                                     BigDecimal currentEngineHours) {
        if (req.getIntervalDays() == null && req.getIntervalHours() == null) {
            throw new IllegalArgumentException("intervalDays or intervalHours required");
        }
        ServiceScheduleItem item = scheduleRepo.findByVesselIdAndServiceType(vesselId, type)
            .orElseGet(() -> ServiceScheduleItem.builder()
                .vesselId(vesselId)
                .clientId(clientId)
                .serviceType(type)
                .status(ScheduleStatus.ACTIVE)
                .build());

        item.setIntervalDays(req.getIntervalDays());
        item.setIntervalHours(req.getIntervalHours());

        if (req.getNextDueDate() != null) {
            item.setNextDueDate(req.getNextDueDate());
        } else if (item.getNextDueDate() == null && req.getIntervalDays() != null) {
            item.setNextDueDate(LocalDate.now(clock).plusDays(req.getIntervalDays()));
        }

        if (req.getNextDueHours() != null) {
            item.setNextDueHours(req.getNextDueHours());
        } else if (item.getNextDueHours() == null && req.getIntervalHours() != null && currentEngineHours != null) {
            item.setNextDueHours(currentEngineHours.add(req.getIntervalHours()));
        }

        item.setStatus(ScheduleStatus.ACTIVE);
        // Reset notify-debounce so the user sees the new schedule reflected
        // promptly in the reminder cycle.
        item.setLastNotifiedAt(null);

        ServiceScheduleItem saved = scheduleRepo.save(item);
        return toDTO(saved, currentEngineHours);
    }

    /**
     * Called after a {@code ServiceHistoryRecord} is written for {@code type}.
     * If a schedule exists, recompute the next due date/hours from the just-
     * performed service. Returns the updated DTO; if no schedule exists,
     * returns empty (clients can opt in later via {@link #upsert}).
     */
    public Optional<ServiceScheduleDTO> advanceAfterService(
            Long vesselId, ServiceType type, LocalDate performedOn, BigDecimal engineHoursAtService,
            BigDecimal currentEngineHours) {
        return scheduleRepo.findByVesselIdAndServiceType(vesselId, type).map(item -> {
            if (item.getIntervalDays() != null) {
                item.setNextDueDate(performedOn.plusDays(item.getIntervalDays()));
            }
            if (item.getIntervalHours() != null && engineHoursAtService != null) {
                item.setNextDueHours(engineHoursAtService.add(item.getIntervalHours()));
            }
            item.setLastNotifiedAt(null); // re-arm reminder for the next cycle
            item.setSnoozedUntil(null);
            ServiceScheduleItem saved = scheduleRepo.save(item);
            return toDTO(saved, currentEngineHours);
        });
    }

    /**
     * Called after a {@code ServiceHistoryRecord} is deleted. If that record
     * was the most recent of its type, we'd previously advanced the schedule
     * to {@code lastRecord.performedOn + intervalDays} — re-derive from the new
     * most-recent or fall back to today + intervalDays.
     */
    public void recomputeFromHistory(Long vesselId, ServiceType type) {
        scheduleRepo.findByVesselIdAndServiceType(vesselId, type).ifPresent(item -> {
            LocalDate anchor = historyRepo
                .findFirstByVesselIdAndServiceTypeOrderByPerformedOnDescIdDesc(vesselId, type)
                .map(record -> record.getPerformedOn())
                .orElse(LocalDate.now(clock));
            BigDecimal anchorHours = historyRepo
                .findFirstByVesselIdAndServiceTypeOrderByPerformedOnDescIdDesc(vesselId, type)
                .map(record -> record.getEngineHoursAtService())
                .orElse(null);

            if (item.getIntervalDays() != null) {
                item.setNextDueDate(anchor.plusDays(item.getIntervalDays()));
            }
            if (item.getIntervalHours() != null && anchorHours != null) {
                item.setNextDueHours(anchorHours.add(item.getIntervalHours()));
            }
            scheduleRepo.save(item);
        });
    }

    public ServiceScheduleDTO snooze(Long vesselId, ServiceType type, int days, BigDecimal currentEngineHours) {
        ServiceScheduleItem item = scheduleRepo.findByVesselIdAndServiceType(vesselId, type)
            .orElseThrow(() -> new ServiceScheduleNotFoundException(vesselId, type.name()));
        item.setSnoozedUntil(LocalDate.now(clock).plusDays(days));
        return toDTO(scheduleRepo.save(item), currentEngineHours);
    }

    public ServiceScheduleDTO setStatus(Long vesselId, ServiceType type, ScheduleStatus status,
                                        BigDecimal currentEngineHours) {
        ServiceScheduleItem item = scheduleRepo.findByVesselIdAndServiceType(vesselId, type)
            .orElseThrow(() -> new ServiceScheduleNotFoundException(vesselId, type.name()));
        item.setStatus(status);
        return toDTO(scheduleRepo.save(item), currentEngineHours);
    }

    public ServiceScheduleDTO toDTO(ServiceScheduleItem item, BigDecimal currentEngineHours) {
        LocalDate today = LocalDate.now(clock);
        Integer daysUntilDue = item.getNextDueDate() == null
            ? null
            : (int) java.time.temporal.ChronoUnit.DAYS.between(today, item.getNextDueDate());
        BigDecimal hoursUntilDue = (item.getNextDueHours() == null || currentEngineHours == null)
            ? null
            : item.getNextDueHours().subtract(currentEngineHours);

        Urgency urgency = classify(daysUntilDue, hoursUntilDue);

        return ServiceScheduleDTO.builder()
            .id(item.getId())
            .vesselId(item.getVesselId())
            .serviceType(item.getServiceType())
            .intervalDays(item.getIntervalDays())
            .intervalHours(item.getIntervalHours())
            .nextDueDate(item.getNextDueDate())
            .nextDueHours(item.getNextDueHours())
            .status(item.getStatus())
            .snoozedUntil(item.getSnoozedUntil())
            .daysUntilDue(daysUntilDue)
            .hoursUntilDue(hoursUntilDue)
            .urgency(urgency)
            .build();
    }

    public Urgency classify(Integer daysUntilDue, BigDecimal hoursUntilDue) {
        boolean overdueByDate = daysUntilDue != null && daysUntilDue < 0;
        boolean overdueByHours = hoursUntilDue != null && hoursUntilDue.signum() < 0;
        if (overdueByDate || overdueByHours) return Urgency.OVERDUE;

        boolean dueSoonByDate = daysUntilDue != null && daysUntilDue <= lookAheadDays;
        boolean dueSoonByHours = hoursUntilDue != null
            && hoursUntilDue.compareTo(BigDecimal.valueOf(hoursTolerance)) <= 0;
        if (dueSoonByDate || dueSoonByHours) return Urgency.DUE_SOON;

        return Urgency.UPCOMING;
    }
}
