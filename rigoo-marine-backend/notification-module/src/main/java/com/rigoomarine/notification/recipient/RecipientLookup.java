package com.rigoomarine.notification.recipient;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;

/**
 * Minimal lookup against the {@code clients} table (owned by client-module but
 * shared in the same database) to resolve a clientId → email + locale pair for
 * outbound notifications. Uses JdbcTemplate so notification-module does not
 * need a {@code Client} JPA entity duplicated from client-module.
 *
 * <p>preferred_language column may not exist on older deployments — defaults
 * to "en" when missing; an Arabic clean-up migration would be a separate task.
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
                "SELECT email, name FROM clients WHERE id = ?",
                rs -> {
                    if (rs.next()) {
                        return Optional.of(new Recipient(
                            clientId,
                            rs.getString("email"),
                            rs.getString("name"),
                            "en"  // preferred_language not yet wired — see PAUSE_TASKS
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

    public record Recipient(Long clientId, String email, String name, String locale) {
        public String safeLocale() {
            return locale == null ? "en" : locale.toLowerCase(Locale.ROOT);
        }
    }
}
