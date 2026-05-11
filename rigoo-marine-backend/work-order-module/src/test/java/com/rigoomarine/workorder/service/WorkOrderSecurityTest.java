package com.rigoomarine.workorder.service;

import com.rigoomarine.workorder.repository.WorkOrderRepository;
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
class WorkOrderSecurityTest {

    @Mock
    private WorkOrderRepository workOrderRepository;

    @InjectMocks
    private WorkOrderSecurity workOrderSecurity;

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
        assertFalse(workOrderSecurity.canAccess(1L));
        verifyNoInteractions(workOrderRepository);
    }

    @Test
    void canAccess_returnsTrue_forAdmin_withoutRepositoryHit() {
        authenticate(new AuthenticatedUser("admin@x.com", 99L, List.of("ROLE_ADMIN")), "ROLE_ADMIN");
        assertTrue(workOrderSecurity.canAccess(7L));
        verifyNoInteractions(workOrderRepository);
    }

    @Test
    void canAccess_returnsTrue_forAssignedTechnician() {
        authenticate(new AuthenticatedUser("tech@x.com", 50L, List.of("ROLE_TECHNICIAN")), "ROLE_TECHNICIAN");
        when(workOrderRepository.existsByIdAndAssignedTechnicianId(7L, 50L)).thenReturn(true);

        assertTrue(workOrderSecurity.canAccess(7L));
        verify(workOrderRepository, never()).existsByIdAndClientId(any(), any());
    }

    @Test
    void canAccess_returnsFalse_forUnassignedTechnician() {
        authenticate(new AuthenticatedUser("tech@x.com", 50L, List.of("ROLE_TECHNICIAN")), "ROLE_TECHNICIAN");
        when(workOrderRepository.existsByIdAndAssignedTechnicianId(7L, 50L)).thenReturn(false);

        assertFalse(workOrderSecurity.canAccess(7L));
    }

    @Test
    void canAccess_returnsTrue_forOwner() {
        authenticate(new AuthenticatedUser("u@x.com", 42L, List.of("ROLE_CLIENT")), "ROLE_CLIENT");
        when(workOrderRepository.existsByIdAndClientId(7L, 42L)).thenReturn(true);

        assertTrue(workOrderSecurity.canAccess(7L));
        verify(workOrderRepository, never()).existsByIdAndAssignedTechnicianId(any(), any());
    }

    @Test
    void canAccess_returnsFalse_forNonOwner() {
        authenticate(new AuthenticatedUser("u@x.com", 42L, List.of("ROLE_CLIENT")), "ROLE_CLIENT");
        when(workOrderRepository.existsByIdAndClientId(7L, 42L)).thenReturn(false);

        assertFalse(workOrderSecurity.canAccess(7L));
    }

    @Test
    void canAccess_returnsFalse_whenClientIdMissingFromToken() {
        authenticate(new AuthenticatedUser("legacy@x.com", null, List.of("ROLE_CLIENT")), "ROLE_CLIENT");

        assertFalse(workOrderSecurity.canAccess(7L));
        verifyNoInteractions(workOrderRepository);
    }

    @Test
    void canAccess_returnsFalse_whenWorkOrderIdIsNull() {
        authenticate(new AuthenticatedUser("u@x.com", 42L, List.of("ROLE_CLIENT")), "ROLE_CLIENT");

        assertFalse(workOrderSecurity.canAccess(null));
        verifyNoInteractions(workOrderRepository);
    }
}
