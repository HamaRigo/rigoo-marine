package com.rigoomarine.maintenance.dto;

import com.rigoomarine.maintenance.entity.ServiceType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateServiceHistoryRequest {

    @NotNull
    private ServiceType serviceType;

    @NotNull
    @PastOrPresent
    private LocalDate performedOn;

    @DecimalMin(value = "0.0", inclusive = true)
    @Digits(integer = 9, fraction = 1)
    private BigDecimal engineHoursAtService;

    @DecimalMin(value = "0.0", inclusive = true)
    @Digits(integer = 10, fraction = 2)
    private BigDecimal cost;

    @Size(min = 3, max = 3)
    private String currency;

    @Size(max = 255)
    private String performedBy;

    private Long technicianId;

    private Long workOrderId;

    @Size(max = 2000)
    private String notes;
}
