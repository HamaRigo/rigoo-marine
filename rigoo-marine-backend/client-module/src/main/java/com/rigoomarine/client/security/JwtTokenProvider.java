package com.rigoomarine.client.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.stream.Collectors;

@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${jwt.secret:rigoo-marine-secret-key-change-in-production-12345}") String secret,
            @Value("${jwt.expiration:86400000}") long expirationMs
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(Authentication authentication) {
        org.springframework.security.core.userdetails.UserDetails userDetails =
                (org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal();

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("roles", userDetails.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.toList()))
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    public String generateToken(String email, String role) {
        return generateToken(email, role, null, null);
    }

    public String generateToken(String email, String role, Long pwdChangedAtMillis) {
        return generateToken(email, role, pwdChangedAtMillis, null);
    }

    /**
     * @param pwdChangedAtMillis password_changed_at as epoch millis. Embedded as a "pwdIat" claim
     *                           so downstream services can reject tokens issued before the user's
     *                           last password change without a DB round-trip.
     * @param clientId           the issuing client's primary-key id, embedded as a "clientId" claim.
     *                           Downstream services use it for ownership checks without resolving
     *                           email → id at every request.
     */
    public String generateToken(String email, String role, Long pwdChangedAtMillis, Long clientId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        var builder = Jwts.builder()
                .id(java.util.UUID.randomUUID().toString())
                .subject(email)
                .claim("roles", java.util.List.of("ROLE_" + role))
                .issuedAt(now)
                .expiration(expiryDate);
        if (pwdChangedAtMillis != null) {
            builder.claim("pwdIat", pwdChangedAtMillis);
        }
        if (clientId != null) {
            builder.claim("clientId", clientId);
        }
        return builder.signWith(secretKey, Jwts.SIG.HS256).compact();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = parseClaims(token);
        // For now, we'll need to look up the user by email from the token subject
        // The actual user ID would need to be stored in claims or looked up
        return null; // Will be handled by service layer
    }

    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public io.jsonwebtoken.Claims getClaims(String token) {
        return parseClaims(token);
    }

    public String getRoleFromToken(String token) {
        Claims claims = parseClaims(token);
        java.util.List<String> roles = claims.get("roles", java.util.List.class);
        if (roles != null && !roles.isEmpty()) {
            return roles.get(0).replace("ROLE_", "");
        }
        return "CLIENT";
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            return e.getClaims();
        }
    }
}
