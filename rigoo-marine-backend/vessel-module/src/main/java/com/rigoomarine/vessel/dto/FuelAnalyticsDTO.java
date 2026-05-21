package com.rigoomarine.vessel.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FuelAnalyticsDTO {

    private Long vesselId;
    private int year;
    private BigDecimal totalLiters;
    private BigDecimal totalCost;
    private String currency;
    private int recordCount;
    private List<MonthlyFuelDTO> byMonth;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MonthlyFuelDTO {
        private int month;
        private BigDecimal liters;
        private BigDecimal cost;
        private int fills;
    }
}
