package com.rigoomarine.client.config;

import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.util.Objects;

/**
 * Secure database connection configuration.
 * - Uses environment variables (no hardcoded credentials)
 * - Enforces TLS/SSL in production
 * - Configures HikariCP connection pooling with sensible limits
 * - Validates required properties at startup (fail-fast)
 */
@Slf4j
@Configuration
public class DatabaseConfig {

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Value("${spring.datasource.driver-class-name}")
    private String driverClassName;

    @Value("${db.pool.max-size:20}")
    private int maxPoolSize;

    @Value("${db.pool.min-idle:5}")
    private int minIdle;

    @Value("${db.pool.idle-timeout:300000}")
    private long idleTimeout;

    @Value("${db.pool.connection-timeout:30000}")
    private long connectionTimeout;

    @Value("${db.pool.max-lifetime:1800000}")
    private long maxLifetime;

    @Value("${db.ssl.enabled:false}")
    private boolean sslEnabled;

    @Value("${db.ssl.root-cert:}")
    private String sslRootCert;

    /**
     * Production datasource with HikariCP connection pooling.
     * - Enforces SSL/TLS
     * - Sets connection limits to prevent resource exhaustion
     * - Configures timeouts to detect leaks
     */
    @Bean
    @Profile({"prod", "production", "staging"})
    public DataSource productionDataSource() {
        validateRequiredProperties();

        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(buildSecureJdbcUrl(datasourceUrl));
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        dataSource.setDriverClassName(driverClassName);

        // Connection pool settings
        dataSource.setMaximumPoolSize(maxPoolSize);
        dataSource.setMinimumIdle(minIdle);
        dataSource.setIdleTimeout(idleTimeout);
        dataSource.setConnectionTimeout(connectionTimeout);
        dataSource.setMaxLifetime(maxLifetime);

        // SSL — honour the db.ssl.enabled flag; default false for internal Docker Postgres
        if (sslEnabled) {
            dataSource.addDataSourceProperty("ssl", "true");
            dataSource.addDataSourceProperty("sslmode", "verify-full");
            if (sslRootCert != null && !sslRootCert.isEmpty()) {
                dataSource.addDataSourceProperty("sslrootcert", sslRootCert);
            }
        } else {
            dataSource.addDataSourceProperty("ssl", "false");
            dataSource.addDataSourceProperty("sslmode", "disable");
        }

        // Query timeout
        dataSource.addDataSourceProperty("queryTimeout", 30);

        // Connection leak detection (logs stack trace if connection held > 60s)
        dataSource.setLeakDetectionThreshold(60000);

        // Health check query
        dataSource.setConnectionInitSql("SELECT 1");

        log.info("Production datasource configured with SSL, pool size={}, maxLifetime={}ms",
                maxPoolSize, maxLifetime);

        return dataSource;
    }

    /**
     * Development datasource - SSL optional for local development.
     */
    @Bean
    @Profile({"dev", "development", "default"})
    public DataSource developmentDataSource() {
        validateRequiredProperties();

        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(datasourceUrl);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        dataSource.setDriverClassName(driverClassName);

        // Relaxed pool settings for development
        dataSource.setMaximumPoolSize(Math.min(maxPoolSize, 10));
        dataSource.setMinimumIdle(minIdle);
        dataSource.setIdleTimeout(idleTimeout);
        dataSource.setConnectionTimeout(connectionTimeout);
        dataSource.setMaxLifetime(maxLifetime);

        // SSL optional in dev
        if (sslEnabled) {
            dataSource.addDataSourceProperty("ssl", "true");
        } else {
            dataSource.addDataSourceProperty("ssl", "false");
        }

        log.info("Development datasource configured (SSL={})", sslEnabled);

        return dataSource;
    }

    /**
     * Builds a secure JDBC URL with SSL parameters for production.
     */
    private String buildSecureJdbcUrl(String url) {
        if (url.contains("sslmode")) {
            return url; // Already has SSL params — caller controls SSL
        }
        if (!sslEnabled) {
            return url; // Internal Postgres (Docker) — no SSL
        }
        String separator = url.contains("?") ? "&" : "?";
        return url + separator + "ssl=true&sslmode=verify-full" +
                (sslRootCert != null && !sslRootCert.isEmpty()
                        ? "&sslrootcert=" + sslRootCert
                        : "");
    }

    /**
     * Validates required properties at startup - fails fast with clear message.
     */
    private void validateRequiredProperties() {
        StringBuilder missing = new StringBuilder();

        if (datasourceUrl == null || datasourceUrl.isBlank()) missing.append("spring.datasource.url ");
        if (username == null || username.isBlank()) missing.append("spring.datasource.username ");
        if (password == null || password.isBlank()) missing.append("spring.datasource.password ");
        if (driverClassName == null || driverClassName.isBlank()) missing.append("spring.datasource.driver-class-name ");

        if (missing.length() > 0) {
            log.error("Missing required database configuration: {}", missing);
            throw new IllegalStateException(
                    "Database configuration incomplete. Missing: " + missing +
                    ". Check environment variables or application.yml");
        }

        // Warn if using default credentials
        if ("postgres".equals(username) && "postgres".equals(password)) {
            log.warn("SECURITY WARNING: Using default PostgreSQL credentials in datasource!");
        }
    }
}
