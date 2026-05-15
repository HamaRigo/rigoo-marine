package com.rigoomarine.notification.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Redis-backed dedupe for Kafka event redeliveries. A Kafka rebalance, a
 * consumer crash mid-commit, or a max-poll-interval blowup all replay the
 * same event — without dedupe we'd create duplicate Notification rows and
 * fire duplicate emails. The fix is cheap: SETNX (set-if-not-exists) on a
 * key derived from the event's UUID, with a 24h TTL.
 *
 * <p>The key namespace is {@code notif:event:<eventId>}; we deliberately do
 * NOT put the topic in the key so a future consumer in the same module
 * sharing an eventId is also covered. 24h covers any realistic redelivery
 * window — Kafka's max retention for the small-volume notification topics
 * is hours, not days.
 *
 * <p>Failure mode: if Redis is unreachable, {@link #firstTime} returns
 * {@code true} (fail-open). Producing one duplicate email during a Redis
 * outage is strictly better than going silent on every legitimate event.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventDedupe {

    private static final String KEY_PREFIX = "notif:event:";

    private final StringRedisTemplate redis;

    @Value("${app.notifications.dedupe-ttl-hours:24}")
    private long dedupeTtlHours;

    /**
     * Returns {@code true} the first time {@code eventId} is seen, {@code false}
     * on every subsequent call within the TTL window. Null/blank ids fall
     * through to {@code true} — events without an id can't be deduped, but
     * shouldn't be dropped either.
     */
    public boolean firstTime(String eventId) {
        if (eventId == null || eventId.isBlank()) return true;
        try {
            Boolean stored = redis.opsForValue()
                .setIfAbsent(KEY_PREFIX + eventId, "1", Duration.ofHours(dedupeTtlHours));
            // setIfAbsent returns null only when Redis errors; treat the same
            // as a missed dedupe (fail-open) per the class javadoc.
            return stored == null || stored;
        } catch (Exception ex) {
            log.warn("EventDedupe Redis call failed for eventId={}: {} (allowing event through)",
                eventId, ex.getMessage());
            return true;
        }
    }
}
