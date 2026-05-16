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
        // Thin wrapper for callers that don't paginate. Asks the paged
        // variant for one huge page so all the classification + sort still
        // happens SQL-side. The 10_000 cap is a safety net — any caller
        // that really needs more should be using the paged variant.
        return findUpcomingPaged(urgencyFilter, typeFilter, q,
            org.springframework.data.domain.PageRequest.of(0, 10_000)).getContent();
    }

    /**
     * Paged variant. Pushes urgency classification (via CASE WHEN), the
     * urgency-filter, the OVERDUE-first sort, and LIMIT/OFFSET all into
     * SQL — so memory cost is O(pageSize), not O(filteredRows). The
     * separate COUNT query for the page total runs against the same
     * predicate-narrowed result set, which Postgres can index-scan.
     *
     * <p>Why this matters: the previous implementation pulled every
     * matching row over the wire and into the JVM before slicing in
     * memory. At 10k schedules with no filters, that's ~10k rows × 13
     * columns hauled across the network for a 25-row page. The new
     * shape is two narrow queries returning at most pageSize + 1 rows
     * (count + the page itself).
     */
    public Page<AdminUpcomingDTO> findUpcomingPaged(String urgencyFilter, ServiceType typeFilter,
                                                     String q, Pageable pageable) {
        LocalDate today = LocalDate.now(clock);
        LocalDate horizon = today.plusDays(lookAheadDays);
        BigDecimal hoursTol = BigDecimal.valueOf(hoursTolerance);

        // ─── Shared WHERE — applied to both COUNT and SELECT queries. ───
        StringBuilder where = new StringBuilder("""
             WHERE s.status = 'ACTIVE'
               AND (s.snoozed_until IS NULL OR s.snoozed_until < ?)
               AND (
                    -- OVERDUE by date
                    (s.next_due_date IS NOT NULL AND s.next_due_date < ?)
                    -- OVERDUE by engine hours
                 OR (s.next_due_hours IS NOT NULL AND v.current_engine_hours IS NOT NULL
                       AND v.current_engine_hours > s.next_due_hours)
                    -- DUE_SOON by date
                 OR (s.next_due_date IS NOT NULL AND s.next_due_date <= ?)
                    -- DUE_SOON by hours-tolerance
                 OR (s.next_due_hours IS NOT NULL AND v.current_engine_hours IS NOT NULL
                       AND v.current_engine_hours >= s.next_due_hours - ?)
               )
            """);
        List<Object> baseParams = new ArrayList<>();
        baseParams.add(java.sql.Date.valueOf(today));     // snoozed_until guard
        baseParams.add(java.sql.Date.valueOf(today));     // OVERDUE date
        baseParams.add(java.sql.Date.valueOf(horizon));   // DUE_SOON date
        baseParams.add(hoursTol);                         // DUE_SOON hours

        if (typeFilter != null) {
            where.append("   AND s.service_type = ?\n");
            baseParams.add(typeFilter.name());
        }
        if (q != null && !q.trim().isEmpty()) {
            where.append("""
                   AND (c.name  ILIKE ?
                     OR c.email ILIKE ?
                     OR v.name  ILIKE ?)
                """);
            String pattern = "%" + q.trim() + "%";
            baseParams.add(pattern); baseParams.add(pattern); baseParams.add(pattern);
        }

        // ─── COUNT query: cheapest possible cardinality, no DTO mapping. ───
        // Run before the SELECT so total + page can both reflect the urgency
        // filter (which appears in the wrapping query below).
        String urgencyCaseSql = urgencyCase();
        Long total;
        if (urgencyFilter != null && !urgencyFilter.isBlank()) {
            String countSql = "SELECT COUNT(*) FROM (" +
                "  SELECT " + urgencyCaseSql + " AS u" +
                "    FROM service_schedule s" +
                "    JOIN vessels v ON v.id = s.vessel_id" +
                "    JOIN clients c ON c.id = s.client_id " +
                where +
                ") t WHERE t.u = ?";
            List<Object> countParams = new ArrayList<>(urgencyCaseParams(today, horizon, hoursTol));
            countParams.addAll(baseParams);
            countParams.add(urgencyFilter.toUpperCase(Locale.ROOT));
            total = jdbc.queryForObject(countSql, Long.class, countParams.toArray());
        } else {
            String countSql = "SELECT COUNT(*) FROM service_schedule s" +
                "  JOIN vessels v ON v.id = s.vessel_id" +
                "  JOIN clients c ON c.id = s.client_id " + where;
            total = jdbc.queryForObject(countSql, Long.class, baseParams.toArray());
        }
        if (total == null || total == 0) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        // ─── SELECT page. Urgency CASE in the projection so we can sort
        //     + filter on it without re-classifying in Java. LIMIT/OFFSET
        //     applied at the DB so memory cost is bounded by pageSize.
        StringBuilder pageSql = new StringBuilder("""
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
                   c.phone         AS client_phone,
            """).append("       ").append(urgencyCaseSql).append(" AS urgency\n")
              .append("  FROM service_schedule s\n")
              .append("  JOIN vessels v ON v.id = s.vessel_id\n")
              .append("  JOIN clients c ON c.id = s.client_id\n")
              .append(where);

        List<Object> pageParams = new ArrayList<>(urgencyCaseParams(today, horizon, hoursTol));
        pageParams.addAll(baseParams);

        if (urgencyFilter != null && !urgencyFilter.isBlank()) {
            // Wrap the classified rows so we can filter on the computed
            // urgency column without re-evaluating the CASE.
            String outer = "SELECT * FROM (" + pageSql + ") c WHERE c.urgency = ?\n";
            pageSql = new StringBuilder(outer);
            pageParams.add(urgencyFilter.toUpperCase(Locale.ROOT));
        }

        pageSql.append(" ORDER BY CASE urgency WHEN 'OVERDUE' THEN 0 WHEN 'DUE_SOON' THEN 1 ELSE 2 END,\n")
               .append("          next_due_date NULLS LAST\n")
               .append(" LIMIT ? OFFSET ?\n");
        pageParams.add(pageable.getPageSize());
        pageParams.add(pageable.getOffset());

        LocalDate finalToday = today;
        List<AdminUpcomingDTO> rows = jdbc.query(pageSql.toString(), (rs, n) -> {
            AdminUpcomingDTO row = mapRow(rs);
            row.setUrgency(Urgency.valueOf(rs.getString("urgency")));
            // Compute deltas inline — no second pass.
            if (row.getNextDueDate() != null) {
                row.setDaysUntilDue((int) ChronoUnit.DAYS.between(finalToday, row.getNextDueDate()));
            }
            if (row.getNextDueHours() != null && row.getCurrentEngineHours() != null) {
                row.setHoursUntilDue(row.getNextDueHours().subtract(row.getCurrentEngineHours()));
            }
            return row;
        }, pageParams.toArray());

        return new PageImpl<>(rows, pageable, total);
    }

    /** CASE expression that classifies each row's urgency. Bound 4 times. */
    private static String urgencyCase() {
        return """
            CASE
                WHEN (s.next_due_date IS NOT NULL AND s.next_due_date < ?) THEN 'OVERDUE'
                WHEN (s.next_due_hours IS NOT NULL AND v.current_engine_hours IS NOT NULL
                       AND v.current_engine_hours > s.next_due_hours) THEN 'OVERDUE'
                WHEN (s.next_due_date IS NOT NULL AND s.next_due_date <= ?) THEN 'DUE_SOON'
                WHEN (s.next_due_hours IS NOT NULL AND v.current_engine_hours IS NOT NULL
                       AND v.current_engine_hours >= s.next_due_hours - ?) THEN 'DUE_SOON'
                ELSE 'UPCOMING'
            END
            """.trim();
    }

    private static List<Object> urgencyCaseParams(LocalDate today, LocalDate horizon, BigDecimal hoursTol) {
        return List.of(
            java.sql.Date.valueOf(today),
            java.sql.Date.valueOf(horizon),
            hoursTol
        );
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

}
