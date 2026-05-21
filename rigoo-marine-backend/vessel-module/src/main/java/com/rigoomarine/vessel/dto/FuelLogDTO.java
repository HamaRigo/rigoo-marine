package com.rigoomarine.vessel.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FuelLogDTO {
    private Long id;
    private Long vesselId;
    private LocalDate logDate;
    private BigDecimal litersAdded;
    private BigDecimal pricePerLiter;
    private BigDecimal totalCost;
    private String currency;
    private BigDecimal engineHoursAtFuel;
    private String portName;
    private String notes;
    private Instant createdAt;
}
