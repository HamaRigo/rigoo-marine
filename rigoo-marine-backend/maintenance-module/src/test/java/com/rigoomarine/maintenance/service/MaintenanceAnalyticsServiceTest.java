package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.dto.MaintenanceCostSummaryDTO;
import com.rigoomarine.maintenance.dto.MaintenanceCostSummaryDTO.ByMonth;
import com.rigoomarine.maintenance.dto.MaintenanceCostSummaryDTO.ByServiceType;
import com.rigoomarine.maintenance.dto.MaintenanceCostSummaryDTO.ByVessel;
import com.rigoomarine.maintenance.entity.ServiceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Verifies the per-query plumbing: the analytics service issues four
 * narrow queries, doesn't N+1, and pads the monthly array to length 12
 * regardless of how sparse the data is.
 *
 * Each test stubs the specific SQL query the production code issues by
 * matching a fragment of the SQL string — so the test fails loudly if a
 * future refactor moves a query out from under it.
 */
class MaintenanceAnalyticsServiceTest {

    private JdbcTemplate jdbc;
    private MaintenanceAnalyticsService service;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        service = new MaintenanceAnalyticsService(jdbc);
    }

    @Test
    void getCostSummary_aggregatesAllFourDimensions() {
        // Totals query
        when(jdbc.queryForObject(contains("COALESCE(SUM(cost), 0) FROM service_history"),
            eq(BigDecimal.class), any(), any(), any()))
            .thenReturn(new BigDecimal("1850.00"));
        when(jdbc.queryForObject(contains("COUNT(*) FROM service_history"),
            eq(Integer.class), any(), any(), any()))
            .thenReturn(7);

        // byServiceType
        when(jdbc.query(contains("GROUP BY service_type"), any(RowMapper.class),
            any(), any(), any()))
            .thenReturn(List.of(
                ByServiceType.builder()
                    .serviceType(ServiceType.OIL_CHANGE)
                    .totalQar(new BigDecimal("1200.00"))
                    .recordCount(4)
                    .build(),
                ByServiceType.builder()
                    .serviceType(ServiceType.HULL_CLEANING)
                    .totalQar(new BigDecimal("650.00"))
                    .recordCount(3)
                    .build()
            ));

        // byVessel
        when(jdbc.query(contains("GROUP BY h.vessel_id, v.name"), any(RowMapper.class),
            any(), any(), any()))
            .thenReturn(List.of(
                ByVessel.builder()
                    .vesselId(42L).vesselName("Al Bahar")
                    .totalQar(new BigDecimal("1850.00"))
                    .recordCount(7)
                    .build()
            ));

        // byMonth — sparse (only Jan + May reported)
        when(jdbc.query(contains("GROUP BY m"), any(RowMapper.class),
            any(), any(), any()))
            .thenReturn(List.of(
                ByMonth.builder().month(1).totalQar(new BigDecimal("280.00")).build(),
                ByMonth.builder().month(5).totalQar(new BigDecimal("570.00")).build()
            ));

        MaintenanceCostSummaryDTO out = service.getCostSummary(7L, 2026);

        assertThat(out.getYear()).isEqualTo(2026);
        assertThat(out.getTotalQar()).isEqualByComparingTo("1850.00");
        assertThat(out.getRecordCount()).isEqualTo(7);

        assertThat(out.getByServiceType()).hasSize(2);
        assertThat(out.getByServiceType().get(0).getServiceType()).isEqualTo(ServiceType.OIL_CHANGE);

        assertThat(out.getByVessel()).hasSize(1);
        assertThat(out.getByVessel().get(0).getVesselName()).isEqualTo("Al Bahar");

        // byMonth must always be length 12, with zero-rows filling the gaps.
        assertThat(out.getByMonth()).hasSize(12);
        assertThat(out.getByMonth().get(0).getMonth()).isEqualTo(1);
        assertThat(out.getByMonth().get(0).getTotalQar()).isEqualByComparingTo("280.00");
        assertThat(out.getByMonth().get(4).getMonth()).isEqualTo(5);
        assertThat(out.getByMonth().get(4).getTotalQar()).isEqualByComparingTo("570.00");
        // February (index 1) should be a zero-row.
        assertThat(out.getByMonth().get(1).getMonth()).isEqualTo(2);
        assertThat(out.getByMonth().get(1).getTotalQar()).isEqualByComparingTo("0");
    }

    @Test
    void getCostSummary_handlesEmptyHistoryYear() {
        // No services logged this year — totals come back as NULL from
        // SUM, which we COALESCE to 0; counts are 0; lists are empty;
        // byMonth still pads to 12.
        when(jdbc.queryForObject(anyString(), eq(BigDecimal.class), any(), any(), any()))
            .thenReturn(null); // simulates the pre-COALESCE result for robustness
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any(), any(), any()))
            .thenReturn(0);
        when(jdbc.query(anyString(), any(RowMapper.class), any(), any(), any()))
            .thenReturn(List.of());

        MaintenanceCostSummaryDTO out = service.getCostSummary(7L, 2025);

        assertThat(out.getTotalQar()).isEqualByComparingTo("0");
        assertThat(out.getRecordCount()).isZero();
        assertThat(out.getByServiceType()).isEmpty();
        assertThat(out.getByVessel()).isEmpty();
        assertThat(out.getByMonth()).hasSize(12);
        // All 12 months are zero rows.
        for (ByMonth m : out.getByMonth()) {
            assertThat(m.getTotalQar()).isEqualByComparingTo("0");
        }
    }
}
