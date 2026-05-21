package com.rigoomarine.delivery.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class PositionUpdateRequest {
    @NotNull
    private BigDecimal lat;
    @NotNull
    private BigDecimal lng;
    private Float accuracy;
}
