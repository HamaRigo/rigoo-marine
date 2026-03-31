package com.rigoomarine.notification.service;

import com.rigoomarine.notification.entity.Notification;
import com.rigoomarine.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void processWorkOrderEvent(Object event) {
        // Extract event data and create notification
        // This is a simplified version - in production, parse the actual event structure
        Long clientId = extractClientId(event);
        String eventType = extractEventType(event);

        Notification notification = Notification.builder()
            .clientId(clientId)
            .type("WORK_ORDER_UPDATE")
            .title("Work Order Update")
            .message("Your work order status has changed: " + eventType)
            .status(Notification.NotificationStatus.PENDING)
            .channel("KAFKA")
            .build();

        notificationRepository.save(notification);
        sendNotification(notification);
    }

    @Transactional(readOnly = true)
    public List<Notification> getNotificationsByClientId(Long clientId) {
        return notificationRepository.findByClientIdOrderByCreatedAtDesc(clientId);
    }

    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(Long clientId) {
        return notificationRepository.findByClientIdAndRead(clientId, false);
    }

    public Notification markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    private void sendNotification(Notification notification) {
        try {
            // Send via email, SMS, or WhatsApp
            // For now, just mark as sent
            notification.setStatus(Notification.NotificationStatus.SENT);
            notification.setSentAt(java.time.LocalDateTime.now());
            notificationRepository.save(notification);
            log.info("Notification sent: {}", notification.getId());
        } catch (Exception e) {
            notification.setStatus(Notification.NotificationStatus.FAILED);
            notificationRepository.save(notification);
            log.error("Failed to send notification: {}", e.getMessage());
        }
    }

    private Long extractClientId(Object event) {
        // Extract client ID from event - implement based on actual event structure
        return 1L; // Placeholder
    }

    private String extractEventType(Object event) {
        // Extract event type from event
        return "UPDATE"; // Placeholder
    }
}
