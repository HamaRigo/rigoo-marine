package com.rigoomarine.common.security;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

/**
 * Typed principal stored in the Spring SecurityContext. Carries the JWT-derived
 * identity so authorization predicates and service-layer code can reason about
 * the caller without re-parsing claims.
 *
 * <p>Populated by each service's {@code JwtAuthenticationFilter} after token
 * verification + revocation lookup. The same class is used by every service in
 * the system to keep `instanceof AuthenticatedUser` checks portable.
 */
public final class AuthenticatedUser {

    private final String email;
    private final Long clientId;
    private final List<String> roles;

    public AuthenticatedUser(String email, Long clientId, Collection<String> roles) {
        this.email = email;
        this.clientId = clientId;
        this.roles = roles == null ? List.of() : List.copyOf(roles);
    }

    public String getEmail() {
        return email;
    }

    public Long getClientId() {
        return clientId;
    }

    public List<String> getRoles() {
        return roles;
    }

    public boolean hasRole(String role) {
        String r = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        return roles.contains(r);
    }

    @Override
    public String toString() {
        return "AuthenticatedUser{email=" + email + ", clientId=" + clientId + ", roles=" + roles + "}";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AuthenticatedUser other)) return false;
        return Objects.equals(email, other.email)
            && Objects.equals(clientId, other.clientId)
            && Objects.equals(roles, other.roles);
    }

    @Override
    public int hashCode() {
        return Objects.hash(email, clientId, roles);
    }
}
