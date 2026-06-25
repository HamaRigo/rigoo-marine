package com.rigoomarine.maintenance.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateEngineHoursRequest {

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    @Digits(integer = 9, fraction = 2)
    private BigDecimal hours;

    /**
     * When true, the service accepts an out-of-band jump (>= 2000h) without
     * raising {@code INVALID_ENGINE_HOURS}. Used by clients backfilling a
     * legacy reading.
     */
    private boolean force;
}
