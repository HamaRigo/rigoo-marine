package com.rigoomarine.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
    name = "service_schedule",
    uniqueConstraints = @UniqueConstraint(name = "uk_schedule_vessel_type", columnNames = {"vessel_id", "service_type"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceScheduleItem {

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

    @Column(name = "interval_days")
    private Integer intervalDays;

    @Column(name = "interval_hours", precision = 10, scale = 1)
    private BigDecimal intervalHours;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "next_due_hours", precision = 10, scale = 1)
    private BigDecimal nextDueHours;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScheduleStatus status;

    @Column(name = "last_notified_at")
    private Instant lastNotifiedAt;

    @Column(name = "snoozed_until")
    private LocalDate snoozedUntil;

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
        if (status == null) status = ScheduleStatus.ACTIVE;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
