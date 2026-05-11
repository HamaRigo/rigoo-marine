package com.rigoomarine.vessel.service;

import com.rigoomarine.vessel.repository.VesselRepository;
import com.rigoomarine.common.security.AuthenticatedUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VesselSecurityTest {

    @Mock
    private VesselRepository vesselRepository;

    @InjectMocks
    private VesselSecurity vesselSecurity;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(AuthenticatedUser user, String role) {
        var auth = new UsernamePasswordAuthenticationToken(
            user, null, List.of(new SimpleGrantedAuthority(role)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void canAccess_returnsFalse_whenNoAuthentication() {
        assertFalse(vesselSecurity.canAccess(1L));
        verifyNoInteractions(vesselRepository);
    }

    @Test
    void canAccess_returnsTrue_forAdmin_withoutRepositoryHit() {
        authenticate(new AuthenticatedUser("admin@x.com", 99L, List.of("ROLE_ADMIN")), "ROLE_ADMIN");
        assertTrue(vesselSecurity.canAccess(7L));
        verifyNoInteractions(vesselRepository);
    }

    @Test
    void canAccess_returnsTrue_forTechnician_withoutRepositoryHit() {
        authenticate(new AuthenticatedUser("tech@x.com", 50L, List.of("ROLE_TECHNICIAN")), "ROLE_TECHNICIAN");
        assertTrue(vesselSecurity.canAccess(7L));
        verifyNoInteractions(vesselRepository);
    }

    @Test
    void canAccess_returnsTrue_forOwner() {
        authenticate(new AuthenticatedUser("u@x.com", 42L, List.of("ROLE_CLIENT")), "ROLE_CLIENT");
        when(vesselRepository.existsByIdAndClientId(7L, 42L)).thenReturn(true);

        assertTrue(vesselSecurity.canAccess(7L));
    }

    @Test
    void canAccess_returnsFalse_forNonOwner() {
        authenticate(new AuthenticatedUser("u@x.com", 42L, List.of("ROLE_CLIENT")), "ROLE_CLIENT");
        when(vesselRepository.existsByIdAndClientId(7L, 42L)).thenReturn(false);

        assertFalse(vesselSecurity.canAccess(7L));
    }

    @Test
    void canAccess_returnsFalse_whenClientIdMissingFromToken() {
        authenticate(new AuthenticatedUser("legacy@x.com", null, List.of("ROLE_CLIENT")), "ROLE_CLIENT");

        assertFalse(vesselSecurity.canAccess(7L));
        verifyNoInteractions(vesselRepository);
    }

    @Test
    void canAccess_returnsFalse_whenVesselIdIsNull() {
        authenticate(new AuthenticatedUser("u@x.com", 42L, List.of("ROLE_CLIENT")), "ROLE_CLIENT");

        assertFalse(vesselSecurity.canAccess(null));
        verifyNoInteractions(vesselRepository);
    }
}
