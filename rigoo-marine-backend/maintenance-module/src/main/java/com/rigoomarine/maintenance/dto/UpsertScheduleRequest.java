package com.rigoomarine.maintenance.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpsertScheduleRequest {

    @Positive
    private Integer intervalDays;

    @DecimalMin(value = "0.1")
    @Digits(integer = 9, fraction = 1)
    private BigDecimal intervalHours;

    /**
     * Optional manual override of the next due date — useful when seeding a
     * schedule for a vessel that has existing maintenance state. If null, the
     * service computes it from the most recent history record (or {@code today + intervalDays}).
     */
    @FutureOrPresent
    private LocalDate nextDueDate;

    @DecimalMin(value = "0.0")
    @Digits(integer = 9, fraction = 1)
    private BigDecimal nextDueHours;
}
