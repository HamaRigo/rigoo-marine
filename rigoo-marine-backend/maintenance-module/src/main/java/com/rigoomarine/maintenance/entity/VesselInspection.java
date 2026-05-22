package com.rigoomarine.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "vessel_inspections")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class VesselInspection {

    public enum InspectionType   { ROUTINE, ANNUAL, SAFETY, INSURANCE }
    public enum InspectionStatus { SCHEDULED, IN_PROGRESS, PASSED, FAILED, PENDING_REVIEW }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long vesselId;

    @Column(nullable = false)
    private Long clientId;

    private Long inspectorId;

    @Column(nullable = false)
    private LocalDate inspectionDate;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private InspectionType type;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private InspectionStatus status = InspectionStatus.SCHEDULED;

    @Column(columnDefinition = "TEXT")
    private String findings;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDate nextInspectionDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist void prePersist() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate  void preUpdate()  { updatedAt = LocalDateTime.now(); }
}
