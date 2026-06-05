package com.rigoomarine.client.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Runs flyway.repair() before flyway.migrate() on every startup.
 *
 * On a fresh DB: repair() is a no-op; migrate() runs all pending migrations.
 * On a DB with a previously-failed migration (e.g. V27 crash due to the
 * column-count bug): repair() removes the failed history row so migrate()
 * can re-apply the corrected SQL cleanly, without throwing a checksum mismatch.
 */
@Slf4j
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            log.info("flyway.repair: clearing any failed migration history entries");
            flyway.repair();
            log.info("flyway.migrate: applying pending migrations");
            flyway.migrate();
        };
    }
}
