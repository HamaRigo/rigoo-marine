package com.rigoomarine.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/**
 * Static accessors for the current request's authenticated user. Reads from
 * Spring's {@link SecurityContextHolder} — only meaningful after a service's
 * {@code JwtAuthenticationFilter} has populated the context.
 */
public final class SecurityUtils {

    private SecurityUtils() {}

    public static Optional<AuthenticatedUser> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return Optional.empty();
        Object principal = auth.getPrincipal();
        if (principal instanceof AuthenticatedUser user) return Optional.of(user);
        return Optional.empty();
    }

    /**
     * Returns the current caller's clientId, or throws
     * {@code IllegalStateException("SESSION_RESTART_REQUIRED")} if a legacy
     * token (no clientId claim) reached an owner-scoped endpoint. The exception
     * message is the conventional error code consumed by each service's
     * {@code GlobalExceptionHandler} → 401 response.
     */
    public static Long currentClientIdOrThrow() {
        return currentUser()
            .map(AuthenticatedUser::getClientId)
            .filter(java.util.Objects::nonNull)
            .orElseThrow(() -> new IllegalStateException("SESSION_RESTART_REQUIRED"));
    }
}
