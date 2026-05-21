package com.rigoomarine.vessel.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "vessels")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vessel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clientId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    private String engineType;

    private String brand;

    private String model;

    @Column(name = "build_year")
    private String year;

    private String length;

    private String hullMaterial;

    private String registrationNumber;

    /**
     * Engine-hour reading driving maintenance-service's hour-based reminders.
     * Updated transactionally when a client logs a service history record at
     * a higher hour reading (via maintenance-service's internal endpoint).
     */
    @Column(name = "current_engine_hours", precision = 10, scale = 1)
    private BigDecimal currentEngineHours;

    @Column(name = "engine_hours_updated_at")
    private Instant engineHoursUpdatedAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private VesselStatus status = VesselStatus.ACTIVE;

    @Column(name = "photo_url", length = 1024)
    private String photoUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
