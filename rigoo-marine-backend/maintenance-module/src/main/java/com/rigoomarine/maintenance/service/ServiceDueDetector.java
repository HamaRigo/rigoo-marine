package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.entity.ServiceScheduleItem;
import com.rigoomarine.maintenance.entity.Urgency;
import com.rigoomarine.maintenance.exception.VesselLookupUnavailableException;
import com.rigoomarine.maintenance.repository.ServiceScheduleItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The reminder sweep. Called from {@link com.rigoomarine.maintenance.scheduler.ServiceDueScheduler}
 * — never directly from controllers. Returns the list of items that have
 * crossed a threshold AND are eligible to notify (status + snooze + debounce).
 *
 * <p>Engine-hours candidates are read from the DB without an upper bound (the
 * SQL filter only covers calendar dueness); this method then cross-references
 * each row with the vessel's current engine hours. The cost is one
 * {@code GET /api/internal/vessels/{id}/engine-hours} per candidate — bounded
 * because the SQL pre-filter already drops snoozed/debounced items.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ServiceDueDetector {

    private final ServiceScheduleItemRepository scheduleRepo;
    private final VesselClient vesselClient;
    private final Clock clock;

    @Value("${app.maintenance.reminders.look-ahead-days:14}")
    private int lookAheadDays;

    @Value("${app.maintenance.reminders.hours-tolerance:10}")
    private int hoursTolerance;

    @Value("${app.maintenance.reminders.renotify-cooldown-days:7}")
    private int renotifyCooldownDays;

    public List<DueItem> sweep() {
        LocalDate today = LocalDate.now(clock);
        LocalDate horizon = today.plusDays(lookAheadDays);
        Instant cooldownBefore = Instant.now(clock).minus(renotifyCooldownDays, ChronoUnit.DAYS);

        List<ServiceScheduleItem> candidates = scheduleRepo
            .findSweepCandidates(today, horizon, cooldownBefore);

        // Per-vessel engine-hours cache so multiple schedule rows for the same
        // vessel (OIL_CHANGE + IMPELLER, etc.) share one lookup.
        Map<Long, BigDecimal> engineHoursCache = new HashMap<>();

        List<DueItem> due = new ArrayList<>();
        for (ServiceScheduleItem item : candidates) {
            BigDecimal currentHours = engineHoursCache.computeIfAbsent(
                item.getVesselId(), this::readEngineHoursTolerant);

            Integer daysUntilDue = item.getNextDueDate() == null
                ? null
                : (int) ChronoUnit.DAYS.between(today, item.getNextDueDate());
            BigDecimal hoursUntilDue = (item.getNextDueHours() == null || currentHours == null)
                ? null
                : item.getNextDueHours().subtract(currentHours);

            Urgency urgency = classify(daysUntilDue, hoursUntilDue);
            if (urgency == Urgency.UPCOMING) continue;

            due.add(new DueItem(item, currentHours, daysUntilDue, hoursUntilDue, urgency));
        }
        return due;
    }

    public void markNotified(ServiceScheduleItem item) {
        item.setLastNotifiedAt(Instant.now(clock));
        scheduleRepo.save(item);
    }

    private BigDecimal readEngineHoursTolerant(Long vesselId) {
        try {
            Map<String, Object> resp = vesselClient.getEngineHours(vesselId);
            if (resp == null) return null;
            Object hours = resp.get("hours");
            return hours == null ? null : new BigDecimal(hours.toString());
        } catch (VesselLookupUnavailableException ex) {
            log.warn("engineHours unavailable during sweep — vessel={} dropped this cycle", vesselId);
            return null;
        }
    }

    private Urgency classify(Integer daysUntilDue, BigDecimal hoursUntilDue) {
        boolean overdueByDate = daysUntilDue != null && daysUntilDue < 0;
        boolean overdueByHours = hoursUntilDue != null && hoursUntilDue.signum() < 0;
        if (overdueByDate || overdueByHours) return Urgency.OVERDUE;

        boolean dueSoonByDate = daysUntilDue != null && daysUntilDue <= lookAheadDays;
        boolean dueSoonByHours = hoursUntilDue != null
            && hoursUntilDue.compareTo(BigDecimal.valueOf(hoursTolerance)) <= 0;
        if (dueSoonByDate || dueSoonByHours) return Urgency.DUE_SOON;

        return Urgency.UPCOMING;
    }

    public record DueItem(
        ServiceScheduleItem item,
        BigDecimal currentHours,
        Integer daysUntilDue,
        BigDecimal hoursUntilDue,
        Urgency urgency
    ) {}
}
