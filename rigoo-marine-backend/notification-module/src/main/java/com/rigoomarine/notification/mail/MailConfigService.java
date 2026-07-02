package com.rigoomarine.notification.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Reads SMTP settings from the shared contact_info table via JDBC
 * (avoids adding a JPA entity dependency on the client-module schema).
 * Falls back to environment variables if no DB entry exists.
 * Results are cached for 60 seconds to avoid DB reads on every email.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailConfigService {

    private static final String SQL =
        "SELECT key_name, value FROM contact_info WHERE category = 'smtp' AND active = true";

    private final JdbcTemplate jdbc;

    @Value("${SPRING_MAIL_HOST:smtp.gmail.com}")    private String envHost;
    @Value("${SPRING_MAIL_PORT:587}")               private int    envPort;
    @Value("${SPRING_MAIL_USERNAME:}")              private String envUsername;
    @Value("${SPRING_MAIL_PASSWORD:}")              private String envPassword;
    @Value("${MAIL_FROM:no-reply@rigoomarine.com}") private String envFrom;
    @Value("${MAIL_ENABLED:false}")                 private boolean envEnabled;

    private volatile MailConfig cached;
    private volatile long cacheExpiry = 0;
    private static final long TTL_MS = 60_000;

    public MailConfig getConfig() {
        if (cached == null || System.currentTimeMillis() > cacheExpiry) {
            cached = loadFromDb();
            cacheExpiry = System.currentTimeMillis() + TTL_MS;
        }
        return cached;
    }

    public void invalidateCache() {
        cached = null;
        cacheExpiry = 0;
    }

    private MailConfig loadFromDb() {
        try {
            Map<String, String> kv = new HashMap<>();
            jdbc.query(SQL, rs -> {
                kv.put(rs.getString("key_name"), rs.getString("value"));
            });
            return MailConfig.builder()
                .enabled(  Boolean.parseBoolean(kv.getOrDefault("smtp_enabled",  String.valueOf(envEnabled))) )
                .host(     kv.getOrDefault("smtp_host",     envHost) )
                .port(     Integer.parseInt(kv.getOrDefault("smtp_port",     String.valueOf(envPort))) )
                .username( kv.getOrDefault("smtp_user",     envUsername) )
                .password( kv.getOrDefault("smtp_password", envPassword) )
                .from(     kv.getOrDefault("smtp_from",     envFrom) )
                .build();
        } catch (Exception e) {
            log.warn("smtp.config.db_read_failed, using env fallback: {}", e.getMessage());
            return MailConfig.builder()
                .enabled(envEnabled).host(envHost).port(envPort)
                .username(envUsername).password(envPassword).from(envFrom).build();
        }
    }
}
