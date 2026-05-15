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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminMaintenanceServiceTest {

    private static final ZoneId QATAR = ZoneId.of("Asia/Qatar");
    private static final Clock FIXED = Clock.fixed(
        LocalDate.of(2026, 5, 14).atStartOfDay(QATAR).toInstant(), QATAR);

    private JdbcTemplate jdbc;
    private AdminMaintenanceService service;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        service = new AdminMaintenanceService(jdbc, FIXED);
        ReflectionTestUtils.setField(service, "lookAheadDays", 14);
        ReflectionTestUtils.setField(service, "hoursTolerance", 10);
    }

    /**
     * Wire the mocked JdbcTemplate to feed the service's RowMapper one fake
     * ResultSet per input row. Mockito's deep-stub mode would also work but
     * it's noisier — explicit ResultSet stubs per row are easier to reason
     * about when a test fails.
     */
    @SuppressWarnings("unchecked")
    private void stubRows(List<Row> rows) {
        when(jdbc.query(anyString(), any(RowMapper.class))).thenAnswer(inv -> {
            RowMapper<AdminUpcomingDTO> mapper = inv.getArgument(1);
            List<AdminUpcomingDTO> out = new ArrayList<>();
            int i = 0;
            for (Row r : rows) out.add(mapper.mapRow(fakeResultSet(r), i++));
            return out;
        });
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
        return rs;
    }

    // ─── Tests ───────────────────────────────────────────────────────────────

    @Test
    void filtersOverdueOnly_whenUrgencyParamSet() {
        stubRows(List.of(
            row(1L, "OIL_CHANGE", LocalDate.of(2026, 5, 1), null, null, null),    // -13d → OVERDUE
            row(2L, "HULL_CLEANING", LocalDate.of(2026, 5, 20), null, null, null) // +6d  → DUE_SOON
        ));

        var result = service.findUpcoming("OVERDUE", null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUrgency()).isEqualTo(Urgency.OVERDUE);
        assertThat(result.get(0).getServiceType()).isEqualTo(ServiceType.OIL_CHANGE);
    }

    @Test
    void filtersByServiceType() {
        stubRows(List.of(
            row(1L, "OIL_CHANGE", LocalDate.of(2026, 5, 20), null, null, null),
            row(2L, "HULL_CLEANING", LocalDate.of(2026, 5, 20), null, null, null)
        ));

        var result = service.findUpcoming(null, ServiceType.OIL_CHANGE, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getServiceType()).isEqualTo(ServiceType.OIL_CHANGE);
    }

    @Test
    void freeTextMatchesClientAndVesselNames() {
        Row r = new Row(1L, 42L, 7L, "OIL_CHANGE",
            LocalDate.of(2026, 5, 20), null,
            "Al Bahar", "Mohamed Bouallagui", "mohamed@example.com", "+97455500001",
            null, "ACTIVE", null);
        stubRows(List.of(r));

        // Matches each haystack field individually (no fuzzy / space-stripping).
        assertThat(service.findUpcoming(null, null, "bahar")).hasSize(1);
        assertThat(service.findUpcoming(null, null, "MOHAMED")).hasSize(1);
        assertThat(service.findUpcoming(null, null, "@example")).hasSize(1);
        assertThat(service.findUpcoming(null, null, "absent")).isEmpty();
    }

    @Test
    void snoozedRowsAreExcluded() {
        stubRows(List.of(
            row(1L, "OIL_CHANGE", LocalDate.of(2026, 5, 1), null, null, LocalDate.of(2026, 6, 1))
        ));

        // Snooze runs past today → filtered out.
        assertThat(service.findUpcoming(null, null, null)).isEmpty();
    }

    @Test
    void upcomingItemsBeyondLookAheadAreExcluded() {
        stubRows(List.of(
            row(1L, "OIL_CHANGE", LocalDate.of(2026, 7, 14), null, null, null) // +61d
        ));

        assertThat(service.findUpcoming(null, null, null)).isEmpty();
    }

    @Test
    void hoursOverdueIsDetected_whenCurrentExceedsThreshold() {
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
