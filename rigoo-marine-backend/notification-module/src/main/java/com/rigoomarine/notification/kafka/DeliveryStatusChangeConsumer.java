package com.rigoomarine.notification.kafka;

import com.rigoomarine.notification.entity.Notification;
import com.rigoomarine.notification.recipient.RecipientLookup;
import com.rigoomarine.notification.repository.NotificationRepository;
import com.rigoomarine.notification.whatsapp.WhatsAppSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Consumes delivery.status.v1 events published by delivery-module when a task
 * reaches DELIVERED or FAILED. Creates an in-app Notification row for the client
 * and sends WhatsApp if the client has opted in.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeliveryStatusChangeConsumer {

    private final NotificationRepository notificationRepository;
    private final RecipientLookup recipientLookup;
    private final EventDedupe eventDedupe;
    private final NotificationMetrics metrics;

    // Optional — only wired when app.whatsapp.enabled=true
    @Autowired(required = false)
    private WhatsAppSender whatsAppSender;

    private static final String TYPE = "DELIVERY_STATUS_CHANGE";

    @KafkaListener(topics = "delivery.status.v1", groupId = "notification-delivery")
    public void onDeliveryStatusChange(Map<String, Object> event) {
        if (event == null) return;
        metrics.received(TYPE).increment();

        String eventId = stringOf(event.get("eventId"));
        if (!eventDedupe.firstTime(eventId)) {
            log.info("Delivery event eventId={} already processed — skipping", eventId);
            metrics.deduped(TYPE).increment();
            return;
        }

        String status = stringOf(event.get("status"));
        if (!"DELIVERED".equals(status) && !"FAILED".equals(status)) {
            log.debug("Ignoring delivery status {}", status);
            return;
        }

        Object clientIdObj = event.get("clientId");
        if (clientIdObj == null) {
            log.warn("Delivery event missing clientId — skipping");
            metrics.failed(TYPE).increment();
            return;
        }
        Long clientId = ((Number) clientIdObj).longValue();
        String address = stringOf(event.get("deliveryAddress"));
        String failedReason = stringOf(event.get("failedReason"));

        String title;
        String message;
        if ("DELIVERED".equals(status)) {
            title = "Delivery Completed";
            message = "Your delivery to " + address + " has been completed successfully.";
        } else {
            title = "Delivery Failed";
            message = "Your delivery to " + address + " could not be completed." +
                    (failedReason.isBlank() ? "" : " Reason: " + failedReason);
        }

        Notification notification = Notification.builder()
                .clientId(clientId)
                .type(TYPE)
                .title(title)
                .message(message)
                .status(Notification.NotificationStatus.SENT)
                .channel("IN_APP")
                .read(false)
                .sentAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        Optional<RecipientLookup.Recipient> recipientOpt = recipientLookup.findByClientId(clientId);
        recipientOpt.ifPresent(rec -> {
            if (rec.whatsappOptIn() && !rec.notificationsPaused() && whatsAppSender != null) {
                try {
                    whatsAppSender.send(rec.phone(), title + ": " + message);
                    log.info("Sent WhatsApp delivery notification to clientId={}", clientId);
                } catch (Exception ex) {
                    log.warn("WhatsApp send failed for delivery notification clientId={}: {}", clientId, ex.getMessage());
                }
            }
        });

        metrics.processed(TYPE).increment();
        log.info("Processed delivery status change taskId={} status={} clientId={}",
                event.get("taskId"), status, clientId);
    }

    private static String stringOf(Object v) {
        return v == null ? "" : String.valueOf(v);
    }
}
