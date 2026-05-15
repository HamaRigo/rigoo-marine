package com.rigoomarine.maintenance.service;

import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.common.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Writes append-only audit rows into the shared {@code admin_audit} table
 * (owned by client-module, schema-shared across services — see V7 migration)
 * whenever an ADMIN actor mutates maintenance state on behalf of another
 * client. Mirrors the pattern client-module uses for password resets / role
 * changes.
 *
 * <p>Triggering rule: only writes when the current caller has the ADMIN role
 * AND is acting on a vessel they don't personally own. Regular client
 * self-service operations are not audited (they're already attributable via
 * the row's clientId).
 *
 * <p>Failure mode: insert failures are caught + logged at WARN — the audit
 * trail is best-effort. The underlying mutation has already happened by the
 * time we're called; failing the request because of an audit-write hiccup
 * would be worse than the (rare) missing audit row.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MaintenanceAuditLogger {

    private static final String INSERT_SQL = """
        INSERT INTO admin_audit (actor_email, actor_id, action, target_type, target_id, details)
        VALUES (?, ?, ?, ?, ?, ?::text)
        """;

    private final JdbcTemplate jdbc;

    /**
     * Records an admin mutation on behalf of {@code targetClientId}.
     *
     * @param action          MAINTENANCE_SCHEDULE_EDIT | MAINTENANCE_SCHEDULE_SNOOZE |
     *                        MAINTENANCE_SCHEDULE_PAUSE | MAINTENANCE_SCHEDULE_RESUME |
     *                        MAINTENANCE_HISTORY_DELETE
     * @param targetType      VESSEL or SCHEDULE — narrows {@code targetId} so the
     *                        admin dashboard can filter "everything that happened
     *                        to vessel 42".
     * @param targetId        id of the vessel/schedule the action targets
     * @param targetClientId  owner of the affected resource — used to detect "admin
     *                        acting on someone else's data"; null skips the check
     * @param details         JSON blob with action-specific context (the SQL uses
     *                        ::text cast so the column stays a TEXT column).
     */
    public void recordIfAdminActingOnBehalf(String action, String targetType, Long targetId,
                                            Long targetClientId, String details) {
        Optional<AuthenticatedUser> actorOpt = SecurityUtils.currentUser();
        if (actorOpt.isEmpty()) return;
        AuthenticatedUser actor = actorOpt.get();
        if (!actor.hasRole("ADMIN")) return;
        // Skip when admin acts on their own data — already attributable.
        if (targetClientId != null && targetClientId.equals(actor.getClientId())) return;

        try {
            jdbc.update(INSERT_SQL,
                actor.getEmail(),
                actor.getClientId(),
                action,
                targetType,
                targetId,
                details
            );
        } catch (Exception ex) {
            log.warn("Maintenance audit insert failed (action={} targetType={} targetId={}): {}",
                action, targetType, targetId, ex.getMessage());
        }
    }
}
