package com.rigoomarine.notification.kafka;

import com.rigoomarine.notification.entity.Notification;
import com.rigoomarine.notification.mail.EmailTemplateService;
import com.rigoomarine.notification.recipient.RecipientLookup;
import com.rigoomarine.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Consumes {@code maintenance.service-due.v1} events from maintenance-module
 * and fans them out to (a) the in-app notifications feed, (b) the bilingual
 * SERVICE_DUE email template.
 *
 * <p>Deserialised as {@code Map<String,Object>} so this module doesn't need
 * maintenance-module classes on the classpath (matches the shop-orders pattern).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ServiceDueEventConsumer {

    private final EmailTemplateService emailTemplateService;
    private final NotificationRepository notificationRepository;
    private final RecipientLookup recipientLookup;

    @KafkaListener(topics = "maintenance.service-due.v1", groupId = "notification-maintenance")
    @Transactional
    public void onServiceDue(Map<String, Object> event) {
        if (event == null) return;
        Long clientId = asLong(event.get("clientId"));
        if (clientId == null) {
            log.warn("ServiceDueEvent missing clientId — skipping");
            return;
        }

        String serviceType = stringOf(event.get("serviceType"));
        String urgency = stringOf(event.get("urgency"));
        String vesselId = stringOf(event.get("vesselId"));
        String nextDueDate = stringOf(event.get("nextDueDate"));
        String daysUntilDue = stringOf(event.get("daysUntilDue"));

        // 1) In-app row — always persisted so the bell badge surfaces.
        String title = title(serviceType, urgency);
        String body = body(serviceType, urgency, nextDueDate, daysUntilDue);
        Notification notification = Notification.builder()
            .clientId(clientId)
            .type("SERVICE_DUE")
            .title(title)
            .message(body)
            .status(Notification.NotificationStatus.PENDING)
            .channel("IN_APP+EMAIL")
            .read(false)
            .build();
        notificationRepository.save(notification);

        // 2) Email — best-effort. Recipient lookup may miss; locale falls back to "en".
        recipientLookup.findByClientId(clientId).ifPresentOrElse(rec -> {
            Map<String, String> vars = new HashMap<>();
            vars.put("serviceType", humanise(serviceType));
            vars.put("urgency", urgency == null ? "" : urgency);
            vars.put("vesselId", vesselId);
            vars.put("nextDueDate", nextDueDate);
            vars.put("daysUntilDue", daysUntilDue);
            vars.put("customerName", rec.name() == null ? "" : rec.name());
            emailTemplateService.send("SERVICE_DUE", rec.email(), rec.safeLocale(), vars);
            notification.setStatus(Notification.NotificationStatus.SENT);
            notification.setSentAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }, () -> log.warn("No recipient found for clientId={} — in-app only", clientId));
    }

    private static String title(String serviceType, String urgency) {
        String pretty = humanise(serviceType);
        if ("OVERDUE".equals(urgency)) return pretty + " is overdue";
        return pretty + " due soon";
    }

    private static String body(String serviceType, String urgency, String nextDueDate, String daysUntilDue) {
        String pretty = humanise(serviceType);
        if ("OVERDUE".equals(urgency)) {
            return pretty + " was due on " + nextDueDate
                + ". Schedule it as soon as possible to keep your warranty intact.";
        }
        return pretty + " is due on " + nextDueDate
            + (daysUntilDue == null || daysUntilDue.isEmpty() ? "" : " (in " + daysUntilDue + " days)") + ".";
    }

    private static String humanise(String enumValue) {
        if (enumValue == null) return "Service";
        return enumValue.replace('_', ' ').toLowerCase().replaceFirst(".", String.valueOf(Character.toUpperCase(enumValue.charAt(0))));
    }

    private static String stringOf(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private static Long asLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return null; }
    }
}
