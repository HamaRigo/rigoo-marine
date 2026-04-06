package com.rigoomarine.client.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(
                "test-secret-key-for-jwt-token-generation-and-validation",
                3600000 // 1 hour
        );
    }

    @Test
    void generateToken_ShouldCreateValidToken() {
        String token = jwtTokenProvider.generateToken("test@example.com", "CLIENT");

        assertNotNull(token);
        assertTrue(token.length() > 0);
    }

    @Test
    void validateToken_ShouldReturnTrue_ForValidToken() {
        String token = jwtTokenProvider.generateToken("test@example.com", "CLIENT");

        boolean isValid = jwtTokenProvider.validateToken(token);

        assertTrue(isValid);
    }

    @Test
    void validateToken_ShouldReturnFalse_ForInvalidToken() {
        boolean isValid = jwtTokenProvider.validateToken("invalid-token");

        assertFalse(isValid);
    }

    @Test
    void getEmailFromToken_ShouldReturnEmail() {
        String token = jwtTokenProvider.generateToken("test@example.com", "CLIENT");

        String email = jwtTokenProvider.getEmailFromToken(token);

        assertEquals("test@example.com", email);
    }

    @Test
    void getRoleFromToken_ShouldReturnRole() {
        String token = jwtTokenProvider.generateToken("test@example.com", "ADMIN");

        String role = jwtTokenProvider.getRoleFromToken(token);

        assertEquals("ADMIN", role);
    }

    @Test
    void getClaims_ShouldReturnValidClaims() {
        String token = jwtTokenProvider.generateToken("test@example.com", "TECHNICIAN");

        Claims claims = jwtTokenProvider.getClaims(token);

        assertNotNull(claims);
        assertEquals("test@example.com", claims.getSubject());
        List<String> roles = claims.get("roles", List.class);
        assertNotNull(roles);
        assertTrue(roles.contains("ROLE_TECHNICIAN"));
    }
}
