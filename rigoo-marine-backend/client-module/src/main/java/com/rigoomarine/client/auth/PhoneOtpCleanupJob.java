package com.rigoomarine.client.auth;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Scheduled purge of stale {@code phone_otp_codes} rows. Every code has a
 * 5-minute TTL by design, so any row older than {@link #RETENTION_HOURS} hours
 * is past every usable state regardless of {@code used_at}. Keeping rows
 * briefly past their useful life preserves a 24-hour forensic trail.
 *
 * <p>Multi-instance-safe: concurrent {@code DELETE} on overlapping slices is
 * a benign race in Postgres. Fail-open on DB blips: a swallowed exception
 * lets the next cycle (1 hour later) retry.
 *
 * <p>{@code @EnableScheduling} is already wired on {@code MailAsyncConfig}, so
 * no new infrastructure is needed; this component plugs in automatically.
 */
@Slf4j
@Component
public class PhoneOtpCleanupJob {

    private static final int RETENTION_HOURS = 24;
    private static final int BATCH_SIZE = 1000;

    private final PhoneOtpRepository otpRepository;
    private final MeterRegistry meterRegistry;

    public PhoneOtpCleanupJob(PhoneOtpRepository otpRepository, MeterRegistry meterRegistry) {
        this.otpRepository = otpRepository;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Runs every hour, after a 10-minute initial delay so it doesn't fire
     * during application bootstrap (Flyway migrations, bean wiring).
     */
    @Scheduled(fixedDelay = 3_600_000L, initialDelay = 600_000L)
    @Transactional
    public void run() {
        try {
            LocalDateTime threshold = LocalDateTime.now().minus(Duration.ofHours(RETENTION_HOURS));
            int deleted = otpRepository.deleteOlderThan(threshold, BATCH_SIZE);
            if (deleted > 0) {
                log.info("otp.cleanup.purged count={} olderThan={}", deleted, threshold);
                meterRegistry.counter("otp.cleanup.purged").increment(deleted);
            }
        } catch (RuntimeException ex) {
            log.warn("otp.cleanup.failed cause={}", ex.toString());
        }
    }
}
