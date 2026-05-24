package com.rigoomarine.notification.recipient;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Minimal lookup against the {@code clients} table (owned by client-module but
 * shared in the same database) to resolve a clientId → email + locale tuple
 * for outbound notifications. Uses JdbcTemplate so notification-module does
 * not need a {@code Client} JPA entity duplicated from client-module.
 *
 * <p>Reads {@code preferred_language} (V8), {@code unsubscribe_token} (V9),
 * and {@code notifications_paused} (V9). COALESCE on optional columns is
 * defensive — Flyway runs per-module so a phased rollout could briefly
 * leave the client-module columns absent from a maintenance-module probe.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RecipientLookup {

    private static final String COLUMNS =
        "id, email, name, phone, " +
        "COALESCE(preferred_language, 'en') AS lang, " +
        "unsubscribe_token AS unsub_token, " +
        "COALESCE(notifications_paused, FALSE) AS paused, " +
        "COALESCE(whatsapp_opt_in,    FALSE) AS wa_opt_in";

    private final JdbcTemplate jdbc;

    public Optional<Recipient> findByClientId(Long clientId) {
        if (clientId == null) return Optional.empty();
        try {
            return jdbc.query(
                "SELECT " + COLUMNS + " FROM clients WHERE id = ?",
                rs -> rs.next() ? Optional.of(mapRow(rs)) : Optional.empty(),
                clientId
            );
        } catch (Exception ex) {
            log.warn("RecipientLookup failed for clientId={}: {}", clientId, ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Returns all active staff of the given role (e.g. "ADMIN", "TEAM_LEAD")
     * for peer-notification flows (e.g. admin approves → notify all team leads).
     */
    public List<Recipient> findAllByRole(String role) {
        if (role == null || role.isBlank()) return List.of();
        try {
            return jdbc.query(
                "SELECT " + COLUMNS + " FROM clients WHERE UPPER(role) = UPPER(?)",
                (rs, rowNum) -> mapRow(rs),
                role
            );
        } catch (Exception ex) {
            log.warn("RecipientLookup byRole failed for role={}: {}", role, ex.getMessage());
            return List.of();
        }
    }

    /**
     * Email-keyed variant for consumers whose event payload doesn't carry a
     * clientId — e.g. ShopOrderEventConsumer reads userEmail off the order
     * event. Returns empty when no matching client row exists (anonymous
     * checkout would be the future case, none today).
     */
    public Optional<Recipient> findByEmail(String email) {
        if (email == null || email.isBlank()) return Optional.empty();
        try {
            return jdbc.query(
                "SELECT " + COLUMNS + " FROM clients WHERE LOWER(email) = LOWER(?)",
                rs -> rs.next() ? Optional.of(mapRow(rs)) : Optional.empty(),
                email
            );
        } catch (Exception ex) {
            log.warn("RecipientLookup byEmail failed for {}: {}", email, ex.getMessage());
            return Optional.empty();
        }
    }

    private static Recipient mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Recipient(
            rs.getLong("id"),
            rs.getString("email"),
            rs.getString("name"),
            rs.getString("phone"),
            rs.getString("lang"),
            rs.getString("unsub_token"),
            rs.getBoolean("paused"),
            rs.getBoolean("wa_opt_in")
        );
    }

    public record Recipient(
        Long clientId,
        String email,
        String name,
        String phone,
        String locale,
        String unsubscribeToken,
        boolean notificationsPaused,
        boolean whatsappOptIn
    ) {
        public String safeLocale() {
            return locale == null ? "en" : locale.toLowerCase(Locale.ROOT);
        }
    }
}
