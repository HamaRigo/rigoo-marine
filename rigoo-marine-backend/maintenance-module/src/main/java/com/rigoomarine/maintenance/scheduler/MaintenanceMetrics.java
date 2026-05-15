package com.rigoomarine.maintenance.scheduler;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Micrometer counters for the maintenance reminder sweep + Kafka publish.
 * Mirrors the {@code MailMetrics} pattern in client-module so dashboards
 * across the system look consistent.
 *
 * <p>Exposed via {@code /actuator/prometheus} (already wired in every
 * module's actuator config). Names follow the {@code maintenance.*.total}
 * convention — Prometheus naming guide.
 */
@Component
public class MaintenanceMetrics {

    private final MeterRegistry registry;

    public MaintenanceMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    /** A nightly sweep ran. Tag carries the number of candidates surveyed (bucketed). */
    public void recordSweep(int candidates, int published) {
        registry.counter("maintenance.sweep.total").increment();
        registry.counter("maintenance.sweep.candidates.total").increment(candidates);
        registry.counter("maintenance.sweep.published.total").increment(published);
    }

    public Counter publishSuccess(String urgency) {
        return registry.counter("maintenance.publish.total",
            "urgency", urgency == null ? "unknown" : urgency,
            "outcome", "success");
    }

    public Counter publishFailure(String urgency) {
        return registry.counter("maintenance.publish.total",
            "urgency", urgency == null ? "unknown" : urgency,
            "outcome", "failed");
    }
}
