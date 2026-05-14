package com.rigoomarine.maintenance.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SnoozeRequest {

    @Min(1) @Max(365)
    private int days;
}
