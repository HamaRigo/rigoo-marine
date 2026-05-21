package com.rigoomarine.vessel.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateFuelLogRequest {

    @NotNull(message = "Log date is required")
    @PastOrPresent(message = "Log date cannot be in the future")
    private LocalDate logDate;

    @NotNull(message = "Liters added is required")
    @DecimalMin(value = "0.1", message = "Liters added must be positive")
    @Digits(integer = 8, fraction = 2)
    private BigDecimal litersAdded;

    @DecimalMin(value = "0.0")
    @Digits(integer = 5, fraction = 3)
    private BigDecimal pricePerLiter;

    @DecimalMin(value = "0.0")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal totalCost;

    @Size(min = 3, max = 3)
    private String currency;

    @DecimalMin(value = "0.0")
    @Digits(integer = 7, fraction = 1)
    private BigDecimal engineHoursAtFuel;

    @Size(max = 255)
    private String portName;

    @Size(max = 500)
    private String notes;
}
