package com.rigoomarine.client.health;

import com.rigoomarine.client.security.DatabaseAuditLogger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

/**
 * Database health check for Spring Boot Actuator.
 * - Validates connection pool availability
 * - Tests actual database connectivity
 * - Logs failures for security monitoring
 * - Does NOT expose sensitive details in health response
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;
    private final DatabaseAuditLogger auditLogger;

    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            // Test connection with simple query
            connection.createStatement().executeQuery("SELECT 1").close();

            // Get pool metrics (HikariCP specific)
            Map<String, Object> details = getPoolMetrics();

            return Health.up()
                    .withDetail("status", "connected")
                    .withDetails(details)
                    .build();

        } catch (SQLException e) {
            // Log failure for security monitoring
            auditLogger.logConnectionFailure(
                    "configured-host",
                    "configured-database",
                    e.getMessage()
            );

            return Health.down()
                    .withDetail("status", "unreachable")
                    .withDetail("reason", "Connection failed")
                    .build();
        }
    }

    /**
     * Get HikariCP pool metrics for observability.
     */
    private Map<String, Object> getPoolMetrics() {
        Map<String, Object> metrics = new HashMap<>();

        if (dataSource instanceof com.zaxxer.hikari.HikariDataSource hikari) {
            metrics.put("activeConnections", hikari.getHikariPoolMXBean().getActiveConnections());
            metrics.put("idleConnections", hikari.getHikariPoolMXBean().getIdleConnections());
            metrics.put("totalConnections", hikari.getHikariPoolMXBean().getTotalConnections());
            metrics.put("waitingThreads", hikari.getHikariPoolMXBean().getThreadsAwaitingConnection());
            metrics.put("maxPoolSize", hikari.getMaximumPoolSize());
            metrics.put("minIdle", hikari.getMinimumIdle());
        }

        return metrics;
    }
}
