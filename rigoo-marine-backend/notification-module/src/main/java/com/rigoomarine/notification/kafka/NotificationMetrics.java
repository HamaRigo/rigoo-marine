package com.rigoomarine.notification.kafka;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Micrometer counters for Kafka consumer processing in notification-module.
 * Three dimensions per consumer flow:
 * <ul>
 *   <li>{@code received} — incremented for every event that arrives at the listener.</li>
 *   <li>{@code deduped} — incremented when {@link EventDedupe} returns false (redelivery).</li>
 *   <li>{@code processed} — incremented when the consumer completes successfully.</li>
 * </ul>
 *
 * <p>A divergence between {@code received - deduped - processed} is the alert
 * signal: events arriving but not completing means downstream side-effects
 * (DB insert, email send) are failing.
 */
@Component
public class NotificationMetrics {

    private final MeterRegistry registry;

    public NotificationMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public Counter received(String eventType) {
        return registry.counter("notification.events.received.total", "type", tag(eventType));
    }

    public Counter deduped(String eventType) {
        return registry.counter("notification.events.deduped.total", "type", tag(eventType));
    }

    public Counter processed(String eventType) {
        return registry.counter("notification.events.processed.total", "type", tag(eventType));
    }

    public Counter failed(String eventType) {
        return registry.counter("notification.events.failed.total", "type", tag(eventType));
    }

    private static String tag(String t) {
        return t == null ? "unknown" : t;
    }
}
