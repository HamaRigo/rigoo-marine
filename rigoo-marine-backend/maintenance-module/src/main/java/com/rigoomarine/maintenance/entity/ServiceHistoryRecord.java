package com.rigoomarine.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "service_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceHistoryRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vessel_id", nullable = false)
    private Long vesselId;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false, length = 40)
    private ServiceType serviceType;

    @Column(name = "performed_on", nullable = false)
    private LocalDate performedOn;

    @Column(name = "engine_hours_at_service", precision = 10, scale = 1)
    private BigDecimal engineHoursAtService;

    @Column(precision = 12, scale = 2)
    private BigDecimal cost;

    @Column(length = 3, nullable = false)
    private String currency;

    @Column(name = "performed_by")
    private String performedBy;

    @Column(name = "technician_id")
    private Long technicianId;

    @Column(name = "work_order_id")
    private Long workOrderId;

    @Column(length = 2000)
    private String notes;

    @Version
    private Long version;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (currency == null) currency = "QAR";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
