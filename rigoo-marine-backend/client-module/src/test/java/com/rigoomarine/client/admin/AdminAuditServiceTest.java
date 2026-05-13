package com.rigoomarine.client.admin;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAuditServiceTest {

    @Mock private AdminAuditRepository repository;

    private AdminAuditService service;

    @BeforeEach
    void setUp() {
        service = new AdminAuditService(repository);
    }

    @Test
    void record_persistsEntryWithAllFields() {
        service.record(
            "admin@example.com", 1L,
            AdminAuditService.ACTION_PASSWORD_RESET, AdminAuditService.TARGET_USER, 42L,
            "{\"reason\":\"lost-phone\"}",
            "10.0.0.5");

        ArgumentCaptor<AdminAuditEntry> cap = ArgumentCaptor.forClass(AdminAuditEntry.class);
        verify(repository).save(cap.capture());
        AdminAuditEntry saved = cap.getValue();

        assertEquals("admin@example.com", saved.getActorEmail());
        assertEquals(1L, saved.getActorId());
        assertEquals("PASSWORD_RESET", saved.getAction());
        assertEquals("USER", saved.getTargetType());
        assertEquals(42L, saved.getTargetId());
        assertEquals("{\"reason\":\"lost-phone\"}", saved.getDetails());
        assertEquals("10.0.0.5", saved.getIpAddress());
    }

    @Test
    void record_swallowsExceptions_bestEffort() {
        when(repository.save(any(AdminAuditEntry.class)))
            .thenThrow(new RuntimeException("db unavailable"));

        // Must not propagate — the calling admin action already committed.
        assertDoesNotThrow(() -> service.record(
            "admin@example.com", 1L,
            AdminAuditService.ACTION_USER_DELETE, AdminAuditService.TARGET_USER, 42L,
            "{}", "10.0.0.5"));
    }

    @Test
    void recent_withoutAction_returnsAllOrderedByCreatedAtDesc() {
        when(repository.findAllByOrderByCreatedAtDesc(any(Pageable.class)))
            .thenReturn(List.of(entry(1L), entry(2L)));

        List<AdminAuditEntry> result = service.recent(50, null);

        assertEquals(2, result.size());
        verify(repository).findAllByOrderByCreatedAtDesc(eq(PageRequest.of(0, 50)));
    }

    @Test
    void recent_withAction_filtersByAction() {
        when(repository.findAllByActionOrderByCreatedAtDesc(eq("PASSWORD_RESET"), any(Pageable.class)))
            .thenReturn(List.of(entry(1L)));

        List<AdminAuditEntry> result = service.recent(10, "PASSWORD_RESET");

        assertEquals(1, result.size());
        verify(repository).findAllByActionOrderByCreatedAtDesc(eq("PASSWORD_RESET"), eq(PageRequest.of(0, 10)));
    }

    @Test
    void recent_clampLimit_defaultsTo100_whenMissingOrNonPositive() {
        when(repository.findAllByOrderByCreatedAtDesc(any(Pageable.class))).thenReturn(List.of());

        service.recent(null, null);
        verify(repository).findAllByOrderByCreatedAtDesc(eq(PageRequest.of(0, 100)));

        reset(repository);
        when(repository.findAllByOrderByCreatedAtDesc(any(Pageable.class))).thenReturn(List.of());
        service.recent(0, null);
        verify(repository).findAllByOrderByCreatedAtDesc(eq(PageRequest.of(0, 100)));

        reset(repository);
        when(repository.findAllByOrderByCreatedAtDesc(any(Pageable.class))).thenReturn(List.of());
        service.recent(-5, null);
        verify(repository).findAllByOrderByCreatedAtDesc(eq(PageRequest.of(0, 100)));
    }

    @Test
    void recent_clampLimit_capsAt500() {
        when(repository.findAllByOrderByCreatedAtDesc(any(Pageable.class))).thenReturn(List.of());

        service.recent(10000, null);

        verify(repository).findAllByOrderByCreatedAtDesc(eq(PageRequest.of(0, 500)));
    }

    @Test
    void clampLimit_directContract() {
        // Lock the documented bounds — these constants are part of the public API.
        assertEquals(100, AdminAuditService.clampLimit(null));
        assertEquals(100, AdminAuditService.clampLimit(0));
        assertEquals(100, AdminAuditService.clampLimit(-1));
        assertEquals(50,  AdminAuditService.clampLimit(50));
        assertEquals(500, AdminAuditService.clampLimit(500));
        assertEquals(500, AdminAuditService.clampLimit(1_000_000));
    }

    @Test
    void forTarget_delegatesToRepository() {
        when(repository.findAllByTargetTypeAndTargetIdOrderByCreatedAtDesc("USER", 42L))
            .thenReturn(List.of(entry(1L), entry(2L), entry(3L)));

        List<AdminAuditEntry> result = service.forTarget("USER", 42L);

        assertEquals(3, result.size());
    }

    private AdminAuditEntry entry(Long id) {
        return AdminAuditEntry.builder()
            .id(id)
            .actorEmail("admin@example.com")
            .action("PASSWORD_RESET")
            .targetType("USER")
            .targetId(42L)
            .build();
    }
}
