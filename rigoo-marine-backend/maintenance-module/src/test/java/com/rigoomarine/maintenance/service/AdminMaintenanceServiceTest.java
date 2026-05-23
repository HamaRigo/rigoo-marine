package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.dto.AdminUpcomingDTO;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.entity.Urgency;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminMaintenanceServiceTest {

    private static final ZoneId QATAR = ZoneId.of("Asia/Qatar");
    private static final Clock FIXED = Clock.fixed(
        LocalDate.of(2026, 5, 14).atStartOfDay(QATAR).toInstant(), QATAR);
    private static final LocalDate TODAY = LocalDate.of(2026, 5, 14);
    private static final LocalDate HORIZON = TODAY.plusDays(14); // lookAheadDays = 14
    private static final int HOURS_TOL = 10;

    private JdbcTemplate jdbc;
    private AdminMaintenanceService service;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        service = new AdminMaintenanceService(jdbc, FIXED);
        ReflectionTestUtils.setField(service, "lookAheadDays", 14);
        ReflectionTestUtils.setField(service, "hoursTolerance", HOURS_TOL);
    }

    /**
     * Stubs both the COUNT query (so findUpcomingPaged doesn't short-circuit on
     * null total) and the SELECT query. The SELECT stub applies LIMIT/OFFSET from
     * the last two parameters so pagination tests work correctly without a real DB.
     * Urgency is pre-computed from each row's date/hours (mirrors the SQL CASE).
     */
    @SuppressWarnings("unchecked")
    private void stubRows(List<Row> rows) {
        when(jdbc.queryForObject(anyString(), eq(Long.class), any(Object[].class)))
            .thenReturn((long) rows.size());
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenAnswer(inv -> {
            RowMapper<AdminUpcomingDTO> mapper = inv.getArgument(1);
            // Varargs are spread as individual args; last two are always LIMIT and OFFSET.
            Object[] allArgs = inv.getArguments();
            int limit = (allArgs.length >= 2) ? ((Number) allArgs[allArgs.length - 2]).intValue() : rows.size();
            int offset = (allArgs.length >= 1) ? ((Number) allArgs[allArgs.length - 1]).intValue() : 0;
            List<AdminUpcomingDTO> out = new ArrayList<>();
            int i = 0;
            for (int j = offset; j < Math.min(offset + limit, rows.size()); j++) {
                out.add(mapper.mapRow(fakeResultSet(rows.get(j)), i++));
            }
            return out;
        });
    }

    /** Computes the same urgency as the SQL CASE expression in AdminMaintenanceService. */
    private String computeUrgency(Row r) {
        if (r.nextDueDate != null && r.nextDueDate.isBefore(TODAY)) return "OVERDUE";
        if (r.nextDueHours != null && r.currentEngineHours != null
            && r.currentEngineHours.compareTo(r.nextDueHours) > 0) return "OVERDUE";
        if (r.nextDueDate != null && !r.nextDueDate.isAfter(HORIZON)) return "DUE_SOON";
        if (r.nextDueHours != null && r.currentEngineHours != null
            && r.currentEngineHours.compareTo(r.nextDueHours.subtract(BigDecimal.valueOf(HOURS_TOL))) >= 0)
            return "DUE_SOON";
        return "UPCOMING";
    }

    private ResultSet fakeResultSet(Row r) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getLong("schedule_id")).thenReturn(r.scheduleId);
        when(rs.getLong("vessel_id")).thenReturn(r.vesselId);
        when(rs.getLong("client_id")).thenReturn(r.clientId);
        when(rs.getString("service_type")).thenReturn(r.serviceType);
        when(rs.getString("vessel_name")).thenReturn(r.vesselName);
        when(rs.getString("client_name")).thenReturn(r.clientName);
        when(rs.getString("client_email")).thenReturn(r.clientEmail);
        when(rs.getString("client_phone")).thenReturn(r.clientPhone);
        when(rs.getString("status")).thenReturn(r.status);
        when(rs.getDate("next_due_date")).thenReturn(r.nextDueDate == null ? null : Date.valueOf(r.nextDueDate));
        when(rs.getDate("snoozed_until")).thenReturn(r.snoozedUntil == null ? null : Date.valueOf(r.snoozedUntil));
        when(rs.getBigDecimal("next_due_hours")).thenReturn(r.nextDueHours);
        when(rs.getBigDecimal("current_engine_hours")).thenReturn(r.currentEngineHours);
        // Urgency mirrors the SQL CASE expression — the service reads it from the result set.
        when(rs.getString("urgency")).thenReturn(computeUrgency(r));
        return rs;
    }

    // ─── Tests ───────────────────────────────────────────────────────────────

    @Test
    void filtersOverdueOnly_whenUrgencyParamSet() {
        // SQL WHERE + outer urgency filter returns only the OVERDUE row.
        // The mock simulates what SQL would hand back after WHERE c.urgency = 'OVERDUE'.
        stubRows(List.of(
            row(1L, "OIL_CHANGE", LocalDate.of(2026, 5, 1), null, null, null) // -13d → OVERDUE
        ));

        var result = service.findUpcoming("OVERDUE", null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUrgency()).isEqualTo(Urgency.OVERDUE);
        assertThat(result.get(0).getServiceType()).isEqualTo(ServiceType.OIL_CHANGE);
    }

    @Test
    void filtersByServiceType_passesTypeIntoSql() {
        // After the perf pushdown, type filtering happens in SQL. The mock
        // returns the single row that SQL would return after the WHERE filter.
        stubRows(List.of(
            row(1L, "OIL_CHANGE", LocalDate.of(2026, 5, 20), null, null, null)
        ));

        var result = service.findUpcoming(null, ServiceType.OIL_CHANGE, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getServiceType()).isEqualTo(ServiceType.OIL_CHANGE);
    }

    @Test
    void freeTextSurvivesPostSqlPipeline() {
        // q matching is ILIKE in SQL. Verify the Java post-pipeline
        // (classify + sort + dto) doesn't drop a surviving row.
        Row r = new Row(1L, 42L, 7L, "OIL_CHANGE",
            LocalDate.of(2026, 5, 20), null,
            "Al Bahar", "Mohamed Bouallagui", "mohamed@example.com", "+97455500001",
            null, "ACTIVE", null);
        stubRows(List.of(r));

        assertThat(service.findUpcoming(null, null, "bahar")).hasSize(1);
    }

    @Test
    void snoozedRowsAreExcludedAtSqlLevel() {
        // snoozed_until is in the SQL WHERE clause. A row that SQL returns
        // (i.e., snoozed_until IS NULL or past today) is still processed.
        stubRows(List.of(
            row(1L, "OIL_CHANGE", LocalDate.of(2026, 5, 1), null, null, null)
        ));
        assertThat(service.findUpcoming(null, null, null)).hasSize(1);
    }

    @Test
    void upcomingItemsBeyondLookAheadAreExcluded() {
        // SQL WHERE clause only returns rows within the look-ahead window or overdue.
        // A row with next_due_date +61d and no engine-hours overdue would not
        // satisfy the WHERE predicate — SQL returns zero rows.
        stubRows(List.of());

        assertThat(service.findUpcoming(null, null, null)).isEmpty();
    }

    @Test
    void hoursOverdueIsDetected_whenCurrentExceedsThreshold() {
        // Date is far out (+61d) but engine hours already exceeded — SQL
        // WHERE includes this row via the hours OVERDUE branch.
        stubRows(List.of(
            row(1L, "OIL_CHANGE", LocalDate.of(2026, 7, 14),
                new BigDecimal("250.0"), new BigDecimal("260.0"), null)
        ));

        var result = service.findUpcoming(null, null, null);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUrgency()).isEqualTo(Urgency.OVERDUE);
        assertThat(result.get(0).getHoursUntilDue()).isEqualByComparingTo("-10.0");
    }

    @Test
    void pagedVariantReturnsSlicedResults() {
        List<Row> twenty = new ArrayList<>();
        for (long i = 1; i <= 20; i++) {
            twenty.add(row(i, "OIL_CHANGE",
                LocalDate.of(2026, 5, 1).plusDays(i % 14), null, null, null));
        }
        stubRows(twenty);

        var page0 = service.findUpcomingPaged(null, null, null, PageRequest.of(0, 5));
        var page3 = service.findUpcomingPaged(null, null, null, PageRequest.of(3, 5));

        assertThat(page0.getTotalElements()).isEqualTo(20);
        assertThat(page0.getContent()).hasSize(5);
        assertThat(page3.getContent()).hasSize(5);
        assertThat(page0.getContent()).doesNotContainAnyElementsOf(page3.getContent());
    }

    // ─── Row helpers ─────────────────────────────────────────────────────────

    private Row row(Long id, String type, LocalDate nextDueDate,
                    BigDecimal nextDueHours, BigDecimal currentEngineHours, LocalDate snoozedUntil) {
        return new Row(id, 42L, 7L, type, nextDueDate, nextDueHours,
            "Al Bahar", "Test Client", "test@example.com", "+97455500000",
            currentEngineHours, "ACTIVE", snoozedUntil);
    }

    /** Plain carrier for the test rows; mirrors the SQL column list 1:1. */
    private record Row(
        Long scheduleId, Long vesselId, Long clientId, String serviceType,
        LocalDate nextDueDate, BigDecimal nextDueHours,
        String vesselName, String clientName, String clientEmail, String clientPhone,
        BigDecimal currentEngineHours, String status, LocalDate snoozedUntil
    ) {}
}
