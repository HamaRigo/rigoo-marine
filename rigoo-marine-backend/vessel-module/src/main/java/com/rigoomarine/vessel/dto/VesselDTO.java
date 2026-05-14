package com.rigoomarine.vessel.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VesselDTO {
    private Long id;
    private Long clientId;
    private String name;
    private String type;
    private String engineType;
    private String brand;
    private String model;
    private String year;
    private String length;
    private String hullMaterial;
    private String registrationNumber;
    private BigDecimal currentEngineHours;
    private Instant engineHoursUpdatedAt;
    private LocalDateTime createdAt;
}
