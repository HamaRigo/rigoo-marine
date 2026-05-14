package com.rigoomarine.maintenance.event;

import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.entity.Urgency;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Kafka event published nightly when a scheduled maintenance event becomes due
 * (or due-soon). Consumed by notification-module, which fans out to email and
 * the in-app notification feed.
 *
 * <p>Schema lives at topic {@code maintenance.service-due.v1}. New fields are
 * additive (deserialiser is Jackson + {@code IGNORE_UNKNOWN}). Breaking changes
 * bump the version suffix in the topic name.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceDueEvent {
    private String eventId;
    private String eventType;
    private Instant occurredAt;

    private Long clientId;
    private Long vesselId;
    private String vesselName;

    private ServiceType serviceType;
    private Urgency urgency;
    private LocalDate nextDueDate;
    private BigDecimal nextDueHours;
    private BigDecimal currentHours;
    private Integer daysUntilDue;
    private BigDecimal hoursUntilDue;
}
