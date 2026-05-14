package com.rigoomarine.maintenance.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EngineHoursDTO {
    private Long vesselId;
    private BigDecimal currentEngineHours;
    private Instant engineHoursUpdatedAt;
}
