package com.rigoomarine.notification.recipient;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;

/**
 * Minimal lookup against the {@code clients} table (owned by client-module but
 * shared in the same database) to resolve a clientId → email + locale tuple
 * for outbound notifications. Uses JdbcTemplate so notification-module does
 * not need a {@code Client} JPA entity duplicated from client-module.
 *
 * <p>Reads the {@code preferred_language} column added in client-module's V8
 * migration. SQL-level COALESCE protects against legacy rows where the column
 * might be NULL despite the NOT NULL constraint — defensive belt because
 * Flyway runs per-module, so this consumer may transiently see the column
 * before the seed default has taken effect.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RecipientLookup {

    private final JdbcTemplate jdbc;

    public Optional<Recipient> findByClientId(Long clientId) {
        if (clientId == null) return Optional.empty();
        try {
            return jdbc.query(
                "SELECT id, email, name, COALESCE(preferred_language, 'en') AS lang FROM clients WHERE id = ?",
                rs -> {
                    if (rs.next()) {
                        return Optional.of(new Recipient(
                            rs.getLong("id"),
                            rs.getString("email"),
                            rs.getString("name"),
                            rs.getString("lang")
                        ));
                    }
                    return Optional.empty();
                },
                clientId
            );
        } catch (Exception ex) {
            log.warn("RecipientLookup failed for clientId={}: {}", clientId, ex.getMessage());
            return Optional.empty();
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
                "SELECT id, email, name, COALESCE(preferred_language, 'en') AS lang FROM clients WHERE LOWER(email) = LOWER(?)",
                rs -> {
                    if (rs.next()) {
                        return Optional.of(new Recipient(
                            rs.getLong("id"),
                            rs.getString("email"),
                            rs.getString("name"),
                            rs.getString("lang")
                        ));
                    }
                    return Optional.empty();
                },
                email
            );
        } catch (Exception ex) {
            log.warn("RecipientLookup byEmail failed for {}: {}", email, ex.getMessage());
            return Optional.empty();
        }
    }

    public record Recipient(Long clientId, String email, String name, String locale) {
        public String safeLocale() {
            return locale == null ? "en" : locale.toLowerCase(Locale.ROOT);
        }
    }
}
