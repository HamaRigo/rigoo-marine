package com.rigoomarine.notification.service;

import com.rigoomarine.notification.entity.Notification;
import com.rigoomarine.notification.exception.NotificationNotFoundException;
import com.rigoomarine.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationServiceTest {

    private NotificationRepository repo;
    private NotificationService service;

    @BeforeEach
    void setUp() {
        repo = mock(NotificationRepository.class);
        service = new NotificationService(repo);
    }

    @Test
    void markAsRead_setsReadAndSaves_whenOwnerMatches() {
        Notification n = Notification.builder()
            .id(42L).clientId(7L).type("SERVICE_DUE").title("t").message("m")
            .status(Notification.NotificationStatus.PENDING)
            .read(false)
            .build();
        when(repo.findById(42L)).thenReturn(Optional.of(n));

        var dto = service.markAsRead(42L, 7L);

        assertThat(n.getRead()).isTrue();
        verify(repo).save(n);
        assertThat(dto.isRead()).isTrue();
    }

    @Test
    void markAsRead_isIdempotent_whenAlreadyRead() {
        Notification n = Notification.builder()
            .id(42L).clientId(7L).type("SERVICE_DUE").title("t").message("m")
            .status(Notification.NotificationStatus.SENT)
            .read(true)
            .build();
        when(repo.findById(42L)).thenReturn(Optional.of(n));

        service.markAsRead(42L, 7L);

        // No-op save when the row was already read — saves a write round trip.
        verify(repo, never()).save(any(Notification.class));
    }

    @Test
    void markAsRead_collapsesToNotFound_whenCallerIsNotOwner() {
        Notification n = Notification.builder()
            .id(42L).clientId(7L).type("SERVICE_DUE").title("t").message("m")
            .status(Notification.NotificationStatus.PENDING)
            .read(false)
            .build();
        when(repo.findById(42L)).thenReturn(Optional.of(n));

        // 404 (not 403) to avoid leaking id existence — verified by the
        // exception type the handler maps to NOTIFICATION_NOT_FOUND.
        assertThatThrownBy(() -> service.markAsRead(42L, 999L))
            .isInstanceOf(NotificationNotFoundException.class);
        verify(repo, never()).save(any(Notification.class));
    }

    @Test
    void markAsRead_throwsWhenMissing() {
        when(repo.findById(anyLong())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markAsRead(99L, 7L))
            .isInstanceOf(NotificationNotFoundException.class);
    }

    @Test
    void markAllRead_returnsRowsUpdated() {
        when(repo.markAllReadByClientId(7L)).thenReturn(4);
        assertThat(service.markAllRead(7L)).isEqualTo(4);
    }

    @Test
    void getUnreadCount_passesThroughToRepo() {
        when(repo.countByClientIdAndRead(7L, false)).thenReturn(3L);
        assertThat(service.getUnreadCount(7L)).isEqualTo(3L);
    }
}
