package com.rigoomarine.workorder.event;

import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Emitted exactly once when a {@code WorkOrder} transitions INTO {@code COMPLETED}.
 * Consumed by maintenance-module to auto-create the matching service-history rows
 * (one per derived {@code ServiceType}). Schema lives at topic
 * {@code workorder.completed.v1} — additive fields only; bump the suffix on breaks.
 *
 * <p>{@code serviceNames} is best-effort: if service-service is unavailable at
 * completion time, it's null and the consumer falls back to mapping from
 * {@code issueCategory}. {@code completedAt} is the WO's stored timestamp so
 * a redelivery doesn't drift the dossier date.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderCompletedEvent {
    private String eventId;
    private String eventType;
    private Instant occurredAt;

    private Long workOrderId;
    private Long clientId;
    private Long vesselId;
    private Long technicianId;

    private LocalDateTime completedAt;
    private Set<Long> serviceIds;
    /** May be null if service-service was unreachable during the publish. */
    private List<String> serviceNames;
    private String issueCategory;
    private String notes;
}
