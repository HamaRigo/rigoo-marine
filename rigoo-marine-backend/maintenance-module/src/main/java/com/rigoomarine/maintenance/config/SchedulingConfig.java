package com.rigoomarine.maintenance.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * Single source of truth for "now" in the maintenance module. Beans inject
 * {@link Clock} (rather than calling {@code LocalDate.now()} directly) so unit
 * tests can fix time and verify date-based reminder thresholds deterministically.
 *
 * <p>The system timezone defaults to Asia/Qatar regardless of host config — the
 * scheduler cron is interpreted in this zone, so date math must match.
 */
@Configuration
public class SchedulingConfig {

    @Bean
    public Clock maintenanceClock() {
        return Clock.system(ZoneId.of("Asia/Qatar"));
    }
}
