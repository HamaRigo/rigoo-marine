package com.rigoomarine.client.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Writes durable rows to {@code admin_audit} for sensitive admin actions and
 * exposes the recent-actions read path for the ops dashboard.
 *
 * <p>{@link #record} is best-effort: any persistence failure is swallowed and
 * logged at ERROR. The audit row is observability, not the security boundary —
 * a missing row must never block the action that produced it.
 *
 * <p>Common action constants are exposed as static fields so callers don't
 * scatter string literals.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAuditService {

    public static final String ACTION_PASSWORD_RESET = "PASSWORD_RESET";
    public static final String ACTION_ROLE_CHANGE    = "ROLE_CHANGE";
    public static final String ACTION_USER_DELETE    = "USER_DELETE";

    public static final String TARGET_USER = "USER";

    public static final int LIST_LIMIT_DEFAULT = 100;
    public static final int LIST_LIMIT_MAX     = 500;

    private final AdminAuditRepository repository;

    public void record(String actorEmail, Long actorId, String action,
                       String targetType, Long targetId,
                       String details, String ipAddress) {
        try {
            repository.save(AdminAuditEntry.builder()
                .actorEmail(actorEmail)
                .actorId(actorId)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .details(details)
                .ipAddress(ipAddress)
                .build());
        } catch (RuntimeException ex) {
            // Best-effort. The action already committed; log the audit context
            // so it's recoverable from logs in worst case.
            log.error("admin.audit.write_failed action={} target={}:{} actor={} cause={}",
                action, targetType, targetId, actorEmail, ex.toString());
        }
    }

    public List<AdminAuditEntry> recent(Integer limit, String action) {
        int cap = clampLimit(limit);
        if (action == null || action.isBlank()) {
            return repository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, cap));
        }
        return repository.findAllByActionOrderByCreatedAtDesc(action, PageRequest.of(0, cap));
    }

    public List<AdminAuditEntry> forTarget(String targetType, Long targetId) {
        return repository.findAllByTargetTypeAndTargetIdOrderByCreatedAtDesc(targetType, targetId);
    }

    static int clampLimit(Integer requested) {
        if (requested == null || requested <= 0) return LIST_LIMIT_DEFAULT;
        return Math.min(requested, LIST_LIMIT_MAX);
    }
}
