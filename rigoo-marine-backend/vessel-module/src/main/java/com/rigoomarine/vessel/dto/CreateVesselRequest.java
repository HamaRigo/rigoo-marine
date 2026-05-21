package com.rigoomarine.vessel.dto;

import com.rigoomarine.vessel.entity.VesselStatus;
import lombok.*;
import jakarta.validation.constraints.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateVesselRequest {

    // clientId is derived from the JWT principal in VesselService.
    // Only used as a fallback for admin data-import calls; must not be @NotNull.
    private Long clientId;

    private VesselStatus status;

    @Size(max = 1024)
    private String photoUrl;

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
