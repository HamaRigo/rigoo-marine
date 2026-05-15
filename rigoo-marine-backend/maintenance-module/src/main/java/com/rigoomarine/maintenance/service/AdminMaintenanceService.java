package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.dto.AdminUpcomingDTO;
import com.rigoomarine.maintenance.entity.ScheduleStatus;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.entity.Urgency;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Admin cross-client view of due/overdue maintenance. Joins {@code service_schedule},
 * {@code vessels}, and {@code clients} in a single native query so the admin
 * inbox loads in one round trip — no per-row vessel-service calls.
 *
 * <p>Why a native query instead of three repository hops:
 * <ul>
 *   <li>The schedule table holds {@code clientId} + {@code vesselId} but no names;
 *       names live in vessel-service and client-service respectively. Hitting each
 *       service per row would be N*2 lookups for a 200-row admin inbox.</li>
 *   <li>All three tables share the same Postgres schema (different Flyway
 *       histories per service, same physical database). A SQL join here is the
 *       cheapest possible read path and stays inside our existing data plane.</li>
 *   <li>If we ever split databases, this method becomes the seam for a
 *       projection table (CQRS-style) — the controller signature doesn't change.</li>
 * </ul>
 *
 * <p>Filters honoured: urgency (defaults OVERDUE+DUE_SOON), serviceType, and a
 * free-text {@code q} matched against client name/email and vessel name.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AdminMaintenanceService {

    private final JdbcTemplate jdbc;
    private final Clock clock;

    @Value("${app.maintenance.reminders.look-ahead-days:14}")
    private int lookAheadDays;

    @Value("${app.maintenance.reminders.hours-tolerance:10}")
    private int hoursTolerance;

    public List<AdminUpcomingDTO> findUpcoming(String urgencyFilter, ServiceType typeFilter, String q) {
        // Query is intentionally wide-open: returns every ACTIVE schedule row
        // joined to its vessel + owner; classification + filtering happen in
        // Java where the look-ahead and tolerance constants live. Keeps SQL
        // simple and testable; the predicate set is small enough that
        // re-evaluating in Java for ~hundreds of rows is fine.
        String sql = """
            SELECT s.id            AS schedule_id,
                   s.vessel_id     AS vessel_id,
                   s.client_id     AS client_id,
                   s.service_type  AS service_type,
                   s.next_due_date AS next_due_date,
                   s.next_due_hours AS next_due_hours,
                   s.status        AS status,
                   s.snoozed_until AS snoozed_until,
                   v.name          AS vessel_name,
                   v.current_engine_hours AS current_engine_hours,
                   c.name          AS client_name,
                   c.email         AS client_email,
                   c.phone         AS client_phone
              FROM service_schedule s
              JOIN vessels v ON v.id = s.vessel_id
              JOIN clients c ON c.id = s.client_id
             WHERE s.status = 'ACTIVE'
            """;

        List<AdminUpcomingDTO> rows = jdbc.query(sql, (rs, n) -> mapRow(rs));

        LocalDate today = LocalDate.now(clock);
        String qLower = q == null ? null : q.trim().toLowerCase(Locale.ROOT);
        List<AdminUpcomingDTO> filtered = new ArrayList<>();
        for (AdminUpcomingDTO row : rows) {
            // Snooze applies in the admin view too — admins can still see them
            // in the per-vessel dossier, but bulk reminder ops should respect
            // the client's wishes.
            if (row.getSnoozedUntil() != null && !row.getSnoozedUntil().isBefore(today)) continue;

            Integer days = row.getNextDueDate() == null
                ? null
                : (int) ChronoUnit.DAYS.between(today, row.getNextDueDate());
            BigDecimal hours = (row.getNextDueHours() == null || row.getCurrentEngineHours() == null)
                ? null
                : row.getNextDueHours().subtract(row.getCurrentEngineHours());

            Urgency u = classify(days, hours);
            if (u == Urgency.UPCOMING) continue;
            if (urgencyFilter != null && !urgencyFilter.isBlank() && !u.name().equalsIgnoreCase(urgencyFilter)) continue;
            if (typeFilter != null && row.getServiceType() != typeFilter) continue;

            if (qLower != null && !qLower.isEmpty()) {
                boolean hit = (row.getClientName()  != null && row.getClientName().toLowerCase(Locale.ROOT).contains(qLower))
                           || (row.getClientEmail() != null && row.getClientEmail().toLowerCase(Locale.ROOT).contains(qLower))
                           || (row.getVesselName()  != null && row.getVesselName().toLowerCase(Locale.ROOT).contains(qLower));
                if (!hit) continue;
            }

            row.setDaysUntilDue(days);
            row.setHoursUntilDue(hours);
            row.setUrgency(u);
            filtered.add(row);
        }

        // OVERDUE first, then by next_due_date ascending (most urgent at the
        // top — matches the admin workflow of "call the most overdue customer first").
        filtered.sort(Comparator
            .comparing(AdminUpcomingDTO::getUrgency)
            .thenComparing(AdminUpcomingDTO::getNextDueDate,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return filtered;
    }

    /**
     * Paged variant for the admin dashboard table. Slices the already-
     * filtered + sorted list in memory.
     *
     * <p>Scale note: the underlying classify-in-Java pass holds the full
     * result set in memory before pagination. At ~10k vessels with ~15% in
     * the OVERDUE+DUE_SOON window that's ~1500 rows — comfortable. Past
     * ~50k vessels we'd push the urgency calculation into SQL (CASE WHEN
     * against next_due_date / next_due_hours) and LIMIT/OFFSET at the DB
     * level. Documented here so the next person to refactor sees the
     * threshold.
     */
    public Page<AdminUpcomingDTO> findUpcomingPaged(String urgencyFilter, ServiceType typeFilter,
                                                     String q, Pageable pageable) {
        List<AdminUpcomingDTO> all = findUpcoming(urgencyFilter, typeFilter, q);
        int total = all.size();
        int offset = (int) Math.min(pageable.getOffset(), total);
        int end = Math.min(offset + pageable.getPageSize(), total);
        List<AdminUpcomingDTO> slice = all.subList(offset, end);
        return new PageImpl<>(slice, pageable, total);
    }

    private AdminUpcomingDTO mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Date nextDueDate = rs.getDate("next_due_date");
        Date snoozedUntil = rs.getDate("snoozed_until");
        BigDecimal nextDueHours = rs.getBigDecimal("next_due_hours");
        BigDecimal currentEngineHours = rs.getBigDecimal("current_engine_hours");
        return AdminUpcomingDTO.builder()
            .scheduleId(rs.getLong("schedule_id"))
            .vesselId(rs.getLong("vessel_id"))
            .vesselName(rs.getString("vessel_name"))
            .clientId(rs.getLong("client_id"))
            .clientName(rs.getString("client_name"))
            .clientEmail(rs.getString("client_email"))
            .clientPhone(rs.getString("client_phone"))
            .serviceType(ServiceType.valueOf(rs.getString("service_type")))
            .nextDueDate(nextDueDate == null ? null : nextDueDate.toLocalDate())
            .nextDueHours(nextDueHours)
            .currentEngineHours(currentEngineHours)
            .status(ScheduleStatus.valueOf(rs.getString("status")))
            .snoozedUntil(snoozedUntil == null ? null : snoozedUntil.toLocalDate())
            .build();
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
}
