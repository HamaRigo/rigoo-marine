package com.rigoomarine.vessel.dto;

import lombok.*;
import jakarta.validation.constraints.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateVesselRequest {

    @NotNull(message = "Client ID is required")
    private Long clientId;

    @NotBlank(message = "Vessel name is required")
    private String name;

    @NotBlank(message = "Vessel type is required")
    private String type;

    private String engineType;
    private String brand;
    private String model;
    private String year;
    private String length;
    private String hullMaterial;
    private String registrationNumber;
}
