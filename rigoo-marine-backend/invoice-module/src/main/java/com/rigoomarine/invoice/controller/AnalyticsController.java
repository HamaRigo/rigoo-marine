package com.rigoomarine.invoice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Admin analytics endpoint. Pulls revenue and invoice statistics
 * directly from this module's tables using SQL aggregates, keeping
 * the response time bounded regardless of total invoice count.
 *
 * All monetary values are in QAR.
 */
@RestController
@RequestMapping("/api/invoices/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
public class AnalyticsController {

    private final JdbcTemplate jdbc;

    /**
     * @param months  lookback window (default 12, max 24).
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAnalytics(
            @RequestParam(defaultValue = "12") int months
    ) {
        int window = Math.min(Math.max(months, 1), 24);
        LocalDate since = LocalDate.now().minusMonths(window).withDayOfMonth(1);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monthlyRevenue",          monthlyRevenue(since));
        result.put("invoiceStatusBreakdown",   statusBreakdown());
        result.put("topClients",               topClients(5));
        result.put("summary",                  summary(since));
        return ResponseEntity.ok(result);
    }

    // ─── Monthly revenue ───────────────────────────────────────────────────

    private List<Map<String, Object>> monthlyRevenue(LocalDate since) {
        String sql = """
            SELECT TO_CHAR(issue_date, 'YYYY-MM') AS month,
                   COALESCE(SUM(total), 0)         AS revenue,
                   COUNT(*)                         AS invoice_count
              FROM invoices
             WHERE status = 'PAID'
               AND issue_date >= ?
             GROUP BY TO_CHAR(issue_date, 'YYYY-MM')
             ORDER BY month ASC
            """;
        return jdbc.query(sql, (rs, n) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month",        rs.getString("month"));
            row.put("revenue",      rs.getBigDecimal("revenue"));
            row.put("invoiceCount", rs.getLong("invoice_count"));
            return row;
        }, java.sql.Date.valueOf(since));
    }

    // ─── Invoice status breakdown ──────────────────────────────────────────

    private Map<String, Long> statusBreakdown() {
        String sql = "SELECT status, COUNT(*) AS cnt FROM invoices GROUP BY status";
        Map<String, Long> out = new LinkedHashMap<>();
        jdbc.query(sql, rs -> {
            out.put(rs.getString("status"), rs.getLong("cnt"));
        });
        return out;
    }

    // ─── Top clients by PAID invoice total ────────────────────────────────

    private List<Map<String, Object>> topClients(int limit) {
        String sql = """
            SELECT i.client_id,
                   c.name                    AS client_name,
                   c.email                   AS client_email,
                   COALESCE(SUM(i.total), 0) AS total_spend,
                   COUNT(i.id)               AS invoice_count
              FROM invoices i
              LEFT JOIN clients c ON c.id = i.client_id
             WHERE i.status = 'PAID'
             GROUP BY i.client_id, c.name, c.email
             ORDER BY total_spend DESC
             LIMIT ?
            """;
        return jdbc.query(sql, (rs, n) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("clientId",     rs.getLong("client_id"));
            row.put("clientName",   rs.getString("client_name"));
            row.put("clientEmail",  rs.getString("client_email"));
            row.put("totalSpend",   rs.getBigDecimal("total_spend"));
            row.put("invoiceCount", rs.getLong("invoice_count"));
            return row;
        }, limit);
    }

    // ─── Summary KPIs ─────────────────────────────────────────────────────

    private Map<String, Object> summary(LocalDate since) {
        String sql = """
            SELECT
              COALESCE(SUM(CASE WHEN status='PAID' THEN total ELSE 0 END), 0) AS total_revenue,
              COUNT(*)                                                          AS total_invoices,
              COUNT(CASE WHEN status='PAID' THEN 1 END)                        AS paid_count,
              COUNT(CASE WHEN status='PENDING' THEN 1 END)                     AS pending_count,
              COUNT(CASE WHEN status='OVERDUE' THEN 1 END)                     AS overdue_count
            FROM invoices
            WHERE issue_date >= ?
            """;
        return jdbc.queryForObject(sql, (rs, n) -> {
            BigDecimal totalRevenue = rs.getBigDecimal("total_revenue");
            long totalInvoices     = rs.getLong("total_invoices");
            long paidCount         = rs.getLong("paid_count");
            BigDecimal avg = totalInvoices > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalInvoices), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("totalRevenueQar",  totalRevenue);
            row.put("totalInvoices",    totalInvoices);
            row.put("paidInvoices",     paidCount);
            row.put("pendingInvoices",  rs.getLong("pending_count"));
            row.put("overdueInvoices",  rs.getLong("overdue_count"));
            row.put("avgInvoiceValue",  avg);
            return row;
        }, java.sql.Date.valueOf(since));
    }
}
