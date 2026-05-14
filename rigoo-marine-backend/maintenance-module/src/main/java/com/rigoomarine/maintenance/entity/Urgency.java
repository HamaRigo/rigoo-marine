package com.rigoomarine.maintenance.entity;

/**
 * Classification applied by {@code ServiceDueDetector} when assembling the
 * Kafka payload. {@code OVERDUE} → due date in the past or engine hours past
 * the threshold. {@code DUE_SOON} → within the look-ahead window. {@code UPCOMING}
 * → outside the window (used only for the dossier widget, never fires email).
 */
public enum Urgency {
    OVERDUE,
    DUE_SOON,
    UPCOMING
}
