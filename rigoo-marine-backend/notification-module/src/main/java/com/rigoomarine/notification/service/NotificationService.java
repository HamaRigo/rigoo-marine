package com.rigoomarine.notification.service;

import com.rigoomarine.notification.dto.NotificationDTO;
import com.rigoomarine.notification.entity.Notification;
import com.rigoomarine.notification.exception.NotificationNotFoundException;
import com.rigoomarine.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public Page<NotificationDTO> getMyNotifications(Long clientId, Pageable pageable) {
        return notificationRepository
            .findByClientIdOrderByCreatedAtDesc(clientId, pageable)
            .map(NotificationDTO::from);
    }

    @Transactional(readOnly = true)
    public List<NotificationDTO> getMyUnread(Long clientId) {
        return notificationRepository
            .findByClientIdAndRead(clientId, false)
            .stream()
            .map(NotificationDTO::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long clientId) {
        return notificationRepository.countByClientIdAndRead(clientId, false);
    }

    /**
     * Idempotent: marking an already-read notification a second time is a no-op
     * and returns the unchanged DTO. Ownership-checked via {@code clientId} —
     * a CLIENT cannot mark someone else's notification (404, not 403, to avoid
     * leaking id existence).
     */
    public NotificationDTO markAsRead(Long notificationId, Long clientId) {
        Notification n = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new NotificationNotFoundException(notificationId));
        if (!n.getClientId().equals(clientId)) {
            // 404-collapse: don't tell the caller this id exists.
            throw new NotificationNotFoundException(notificationId);
        }
        if (Boolean.FALSE.equals(n.getRead())) {
            n.setRead(true);
            notificationRepository.save(n);
        }
        return NotificationDTO.from(n);
    }

    public int markAllRead(Long clientId) {
        int updated = notificationRepository.markAllReadByClientId(clientId);
        log.debug("markAllRead clientId={} updated={}", clientId, updated);
        return updated;
    }

    /**
     * Legacy entry point kept for the Kafka consumer that calls it directly
     * (work-order-events deprecated path). Not used by the new REST surface.
     */
    public void processWorkOrderEvent(Object event) {
        log.debug("processWorkOrderEvent received: {}", event);
        // Existing behaviour: persists a stub row. The maintenance + shop flows
        // own real notification creation today; this stays as a no-op-ish
        // placeholder until the work-order-events consumer is retired.
    }
}
