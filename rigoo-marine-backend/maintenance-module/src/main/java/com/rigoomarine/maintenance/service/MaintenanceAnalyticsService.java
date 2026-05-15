package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.dto.MaintenanceCostSummaryDTO;
import com.rigoomarine.maintenance.dto.MaintenanceCostSummaryDTO.ByMonth;
import com.rigoomarine.maintenance.dto.MaintenanceCostSummaryDTO.ByServiceType;
import com.rigoomarine.maintenance.dto.MaintenanceCostSummaryDTO.ByVessel;
import com.rigoomarine.maintenance.entity.ServiceType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Read-side aggregation over {@code service_history} for the maintenance-
 * cost analytics dashboard.
 *
 * <p>Four small queries instead of one giant one — each uses the existing
 * {@code idx_service_history_client (client_id, performed_on DESC)} index,
 * GROUP BYs are over tiny cardinalities (10 service types, ~dozens of
 * vessels, 12 months), and the result fits in a single page response.
 * Sub-millisecond at any realistic scale; cacheable at the HTTP layer
 * because the data only changes when the client logs a new history row.
 *
 * <p>Cost is NULL-tolerant: SUM(COALESCE(cost, 0)) keeps the row count
 * accurate even when individual records skip the cost field.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MaintenanceAnalyticsService {

    private final JdbcTemplate jdbc;

    public MaintenanceCostSummaryDTO getCostSummary(Long clientId, int year) {
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to = LocalDate.of(year + 1, 1, 1);
        Date sqlFrom = Date.valueOf(from);
        Date sqlTo = Date.valueOf(to);

        // Totals — one row, no GROUP BY. COALESCE because SUM over an
        // empty result set returns NULL, not 0.
        BigDecimal total = jdbc.queryForObject(
            "SELECT COALESCE(SUM(cost), 0) FROM service_history " +
            "WHERE client_id = ? AND performed_on >= ? AND performed_on < ?",
            BigDecimal.class, clientId, sqlFrom, sqlTo);

        Integer recordCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM service_history " +
            "WHERE client_id = ? AND performed_on >= ? AND performed_on < ?",
            Integer.class, clientId, sqlFrom, sqlTo);

        List<ByServiceType> byType = jdbc.query(
            "SELECT service_type, COALESCE(SUM(cost), 0) AS total, COUNT(*) AS n " +
            "  FROM service_history " +
            " WHERE client_id = ? AND performed_on >= ? AND performed_on < ? " +
            " GROUP BY service_type " +
            " ORDER BY total DESC NULLS LAST",
            (rs, n) -> ByServiceType.builder()
                .serviceType(ServiceType.valueOf(rs.getString("service_type")))
                .totalQar(rs.getBigDecimal("total"))
                .recordCount(rs.getInt("n"))
                .build(),
            clientId, sqlFrom, sqlTo
        );

        // JOIN to vessels for the name. INNER JOIN is fine — every history
        // row references a real vessel (FK enforced at the app layer; if
        // we ever soft-delete vessels, switch to LEFT JOIN here).
        List<ByVessel> byVessel = jdbc.query(
            "SELECT h.vessel_id, v.name, COALESCE(SUM(h.cost), 0) AS total, COUNT(*) AS n " +
            "  FROM service_history h " +
            "  JOIN vessels v ON v.id = h.vessel_id " +
            " WHERE h.client_id = ? AND h.performed_on >= ? AND h.performed_on < ? " +
            " GROUP BY h.vessel_id, v.name " +
            " ORDER BY total DESC NULLS LAST",
            (rs, n) -> ByVessel.builder()
                .vesselId(rs.getLong("vessel_id"))
                .vesselName(rs.getString("name"))
                .totalQar(rs.getBigDecimal("total"))
                .recordCount(rs.getInt("n"))
                .build(),
            clientId, sqlFrom, sqlTo
        );

        // Monthly time series. EXTRACT(MONTH FROM date) is index-supported
        // when the date range is already narrow (one year via the WHERE
        // clause) — the planner uses the index for the range scan then
        // groups in-memory over the small result set.
        List<ByMonth> raw = jdbc.query(
            "SELECT EXTRACT(MONTH FROM performed_on)::int AS m, " +
            "       COALESCE(SUM(cost), 0) AS total " +
            "  FROM service_history " +
            " WHERE client_id = ? AND performed_on >= ? AND performed_on < ? " +
            " GROUP BY m " +
            " ORDER BY m",
            (rs, n) -> ByMonth.builder()
                .month(rs.getInt("m"))
                .totalQar(rs.getBigDecimal("total"))
                .build(),
            clientId, sqlFrom, sqlTo
        );
        // Pad to 12 months so the frontend chart can render a stable
        // x-axis without checking for gaps. Empty months get a zero row.
        List<ByMonth> byMonth = fillMonths(raw);

        return MaintenanceCostSummaryDTO.builder()
            .year(year)
            .totalQar(total == null ? BigDecimal.ZERO : total)
            .recordCount(recordCount == null ? 0 : recordCount)
            .byServiceType(byType)
            .byVessel(byVessel)
            .byMonth(byMonth)
            .build();
    }

    /** Insert zero-rows for missing months so the array is always length 12. */
    private static List<ByMonth> fillMonths(List<ByMonth> raw) {
        List<ByMonth> sorted = new ArrayList<>(raw);
        sorted.sort(Comparator.comparingInt(ByMonth::getMonth));
        List<ByMonth> out = new ArrayList<>(12);
        int idx = 0;
        for (int m = 1; m <= 12; m++) {
            if (idx < sorted.size() && sorted.get(idx).getMonth() == m) {
                out.add(sorted.get(idx));
                idx++;
            } else {
                out.add(ByMonth.builder().month(m).totalQar(BigDecimal.ZERO).build());
            }
        }
        return out;
    }
}
