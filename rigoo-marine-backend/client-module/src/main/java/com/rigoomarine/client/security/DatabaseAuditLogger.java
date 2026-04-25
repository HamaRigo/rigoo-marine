package com.rigoomarine.client.security;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.Marker;
import org.slf4j.MarkerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Security audit logger for database operations.
 * - Logs failed connection attempts
 * - Logs slow queries (masked - no sensitive data)
 * - Uses structured JSON logging for SIEM integration
 */
@Slf4j
@Component
public class DatabaseAuditLogger {

    private static final Marker SECURITY_MARKER = MarkerFactory.getMarker("SECURITY");
    private static final Marker AUDIT_MARKER = MarkerFactory.getMarker("AUDIT");

    /**
     * Log failed database connection attempt.
     * Does NOT log credentials or full connection string.
     */
    public void logConnectionFailure(String host, String database, String reason) {
        Map<String, Object> event = new HashMap<>();
        event.put("timestamp", Instant.now().toString());
        event.put("event_type", "DB_CONNECTION_FAILURE");
        event.put("host", maskHost(host));
        event.put("database", maskDatabase(database));
        event.put("reason", sanitizeReason(reason));

        log.warn(SECURITY_MARKER, "Database connection failed: {}", toJson(event));
    }

    /**
     * Log slow query for performance monitoring.
     * Does NOT log the actual query or parameters.
     */
    public void logSlowQuery(String operation, String table, long durationMs, long thresholdMs) {
        Map<String, Object> event = new HashMap<>();
        event.put("timestamp", Instant.now().toString());
        event.put("event_type", "SLOW_QUERY");
        event.put("operation", sanitizeOperation(operation));
        event.put("table", sanitizeTable(table));
        event.put("duration_ms", durationMs);
        event.put("threshold_ms", thresholdMs);

        log.warn(AUDIT_MARKER, "Slow query detected: {}", toJson(event));
    }

    /**
     * Log successful connection (for audit trail).
     */
    public void logConnectionSuccess(String host, String database) {
        Map<String, Object> event = new HashMap<>();
        event.put("timestamp", Instant.now().toString());
        event.put("event_type", "DB_CONNECTION_SUCCESS");
        event.put("host", maskHost(host));
        event.put("database", maskDatabase(database));

        log.info(AUDIT_MARKER, "Database connection established: {}", toJson(event));
    }

    /**
     * Mask hostname for security (show only first 2 chars).
     */
    private String maskHost(String host) {
        if (host == null || host.length() < 2) return "**";
        return host.substring(0, 2) + "***";
    }

    /**
     * Mask database name.
     */
    private String maskDatabase(String database) {
        if (database == null || database.isEmpty()) return "***";
        return database.substring(0, 1) + "***";
    }

    /**
     * Sanitize error reason - remove any potential PII or credentials.
     */
    private String sanitizeReason(String reason) {
        if (reason == null) return "Unknown error";
        // Remove anything that looks like a password or connection string
        return reason.replaceAll("password[=:][^\\s]+", "password=***")
                     .replaceAll("jdbc:[^\\s]+", "jdbc:***");
    }

    /**
     * Sanitize SQL operation type.
     */
    private String sanitizeOperation(String operation) {
        if (operation == null) return "UNKNOWN";
        String op = operation.toUpperCase().trim();
        return switch (op) {
            case "SELECT", "INSERT", "UPDATE", "DELETE", "MERGE" -> op;
            default -> "OTHER";
        };
    }

    /**
     * Sanitize table name - allow only alphanumeric and underscore.
     */
    private String sanitizeTable(String table) {
        if (table == null) return "unknown";
        return table.replaceAll("[^a-zA-Z0-9_]", "");
    }

    /**
     * Simple JSON serialization for structured logging.
     */
    private String toJson(Map<String, Object> event) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : event.entrySet()) {
            if (!first) sb.append(", ");
            sb.append("\"").append(entry.getKey()).append("\": ");
            Object value = entry.getValue();
            if (value instanceof String) {
                sb.append("\"").append(value).append("\"");
            } else {
                sb.append(value);
            }
            first = false;
        }
        sb.append("}");
        return sb.toString();
    }
}
