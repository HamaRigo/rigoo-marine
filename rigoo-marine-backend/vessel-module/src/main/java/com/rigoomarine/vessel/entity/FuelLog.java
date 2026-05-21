package com.rigoomarine.vessel.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "fuel_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FuelLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long vesselId;

    @Column(nullable = false)
    private Long clientId;

    @Column(nullable = false)
    private LocalDate logDate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal litersAdded;

    @Column(precision = 8, scale = 3)
    private BigDecimal pricePerLiter;

    /**
     * Stored total (overrides liters * price in analytics).
     * Allows recording a receipt amount without knowing per-litre breakdown.
     */
    @Column(precision = 12, scale = 2)
    private BigDecimal totalCost;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "QAR";

    @Column(precision = 10, scale = 1)
    private BigDecimal engineHoursAtFuel;

    @Column(length = 255)
    private String portName;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        if (currency == null) currency = "QAR";
    }
}
