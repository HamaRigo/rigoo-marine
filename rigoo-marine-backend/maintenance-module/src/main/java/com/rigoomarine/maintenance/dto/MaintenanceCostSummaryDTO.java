package com.rigoomarine.maintenance.dto;

import com.rigoomarine.maintenance.entity.ServiceType;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Yearly maintenance-cost roll-up for a single client. Powers the
 * /dashboard/analytics page: total spend, breakdown by service type,
 * breakdown by vessel, monthly time series.
 *
 * <p>All amounts are in QAR (the only currency the system writes — see
 * ServiceHistoryRecord.currency, defaulted in @PrePersist). Future
 * multi-currency support would need an FX layer; out of scope here.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceCostSummaryDTO {

    private int year;
    private BigDecimal totalQar;
    private int recordCount;

    private List<ByServiceType> byServiceType;
    private List<ByVessel> byVessel;
    private List<ByMonth> byMonth;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ByServiceType {
        private ServiceType serviceType;
        private BigDecimal totalQar;
        private int recordCount;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ByVessel {
        private Long vesselId;
        private String vesselName;
        private BigDecimal totalQar;
        private int recordCount;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ByMonth {
        /** 1–12. */
        private int month;
        private BigDecimal totalQar;
    }
}
