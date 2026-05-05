package com.rigoomarine.invoice.payment;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "processed_stripe_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessedStripeEvent {

    @Id
    @Column(name = "event_id")
    private String eventId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "processed_at", nullable = false, updatable = false)
    private LocalDateTime processedAt;

    @PrePersist
    void onCreate() {
        if (processedAt == null) processedAt = LocalDateTime.now();
    }
}
