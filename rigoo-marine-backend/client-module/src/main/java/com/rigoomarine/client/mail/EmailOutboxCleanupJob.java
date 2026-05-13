package com.rigoomarine.client.mail;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Daily purge of terminally-completed {@code email_outbox} rows. The redriver
 * shipped earlier this session leaves rows in {@code SENT} (successful, after
 * any number of retries) or {@code DEAD} (exhausted retries; permanent
 * failure). Both classes accumulate without this job.
 *
 * <p>Retention:
 * <ul>
 *   <li>{@code SENT}  — 7 days. Forensic trail "did we send the verification
 *       email yesterday?" stays useful for ~1 week; then noise.</li>
 *   <li>{@code DEAD}  — 30 days. Permanent failures are rare and need a
 *       longer human-inspection window.</li>
 * </ul>
 * {@code FAILED} and {@code RETRYING} rows are never touched — they're the
 * redriver's working set.
 *
 * <p>Multi-instance-safe: two instances racing against the same eligible slice
 * is benign in Postgres (row-level serialization). Fail-open on DB blips —
 * the next cycle (24 h later) retries.
 */
@Slf4j
@Component
public class EmailOutboxCleanupJob {

    private static final int SENT_RETENTION_DAYS = 7;
    private static final int DEAD_RETENTION_DAYS = 30;
    private static final int BATCH_SIZE = 1000;

    private final EmailOutboxRepository outboxRepository;
    private final MeterRegistry meterRegistry;

    public EmailOutboxCleanupJob(EmailOutboxRepository outboxRepository, MeterRegistry meterRegistry) {
        this.outboxRepository = outboxRepository;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Runs once per day after a 30-minute initial delay to avoid firing during
     * application bootstrap (Flyway migrations, bean wiring, redriver warmup).
     */
    @Scheduled(fixedDelay = 86_400_000L, initialDelay = 1_800_000L)
    @Transactional
    public void run() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime sentThreshold = now.minus(Duration.ofDays(SENT_RETENTION_DAYS));
            LocalDateTime deadThreshold = now.minus(Duration.ofDays(DEAD_RETENTION_DAYS));

            int deletedSent = outboxRepository.deleteSentOlderThan(sentThreshold, BATCH_SIZE);
            int deletedDead = outboxRepository.deleteDeadOlderThan(deadThreshold, BATCH_SIZE);

            if (deletedSent + deletedDead > 0) {
                log.info(
                    "email_outbox.cleanup.purged sent={} dead={} sentBefore={} deadBefore={}",
                    deletedSent, deletedDead, sentThreshold, deadThreshold);
                if (deletedSent > 0) {
                    meterRegistry.counter("email_outbox.cleanup.sent.purged").increment(deletedSent);
                }
                if (deletedDead > 0) {
                    meterRegistry.counter("email_outbox.cleanup.dead.purged").increment(deletedDead);
                }
            }
        } catch (RuntimeException ex) {
            log.warn("email_outbox.cleanup.failed cause={}", ex.toString());
        }
    }
}
