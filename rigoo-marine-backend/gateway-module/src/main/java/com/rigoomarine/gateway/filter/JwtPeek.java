package com.rigoomarine.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;

import javax.crypto.SecretKey;

/**
 * Minimal JWT helper for the gateway: verifies HS256 signature and returns the
 * {@code jti} claim. Anything else (expiry, role checks, etc.) is left to
 * the downstream services — this filter's only job is revocation lookup.
 */
final class JwtPeek {

    private JwtPeek() {}

    /**
     * @return the jti claim, or null if the token is missing, malformed, or
     *         has an invalid signature. Never throws.
     */
    static String readJti(String token, SecretKey key) {
        if (token == null || token.isBlank() || key == null) return null;
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getId();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
