package com.rigoomarine.notification.kafka;

import com.rigoomarine.notification.entity.Notification;
import com.rigoomarine.notification.recipient.RecipientLookup;
import com.rigoomarine.notification.repository.NotificationRepository;
import com.rigoomarine.notification.whatsapp.WhatsAppPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Consumes {@code work-order-events} published by work-order-service for every
 * lifecycle transition (created, status changed, technician assigned, etc.).
 *
 * <p>Creates an in-app Notification row for the client on meaningful transitions.
 * Sends WhatsApp on COMPLETED if the client has opted in.
 *
 * <p>Event schema (from WorkOrderService.NotificationEvent):
 * <pre>
 *   eventType  : String  — WORK_ORDER_CREATED | WORK_ORDER_STATUS_CHANGED |
 *                          TECHNICIAN_ASSIGNED | SERVICE_REQUEST_SUBMITTED |
 *                          SERVICE_REQUEST_APPROVED | SERVICE_REQUEST_REJECTED
 *   workOrderId: Long
 *   clientId   : Long
 *   status     : String  — current WorkOrder status (e.g. IN_PROGRESS, COMPLETED)
 *   timestamp  : String  (LocalDateTime serialised as ISO-8601)
 * </pre>
 */
@Slf4j
@Component
public class WorkOrderEventConsumer {

    private final NotificationRepository notificationRepository;
    private final RecipientLookup recipientLookup;
    private final EventDedupe eventDedupe;
    private final NotificationMetrics metrics;

    @Autowired(required = false)
    private WhatsAppPort whatsAppSender;

    public WorkOrderEventConsumer(
            NotificationRepository notificationRepository,
            RecipientLookup recipientLookup,
            EventDedupe eventDedupe,
            NotificationMetrics metrics
    ) {
        this.notificationRepository = notificationRepository;
        this.recipientLookup = recipientLookup;
        this.eventDedupe = eventDedupe;
        this.metrics = metrics;
    }

    @KafkaListener(topics = "work-order-events", groupId = "notification-work-orders")
    @Transactional
    public void onWorkOrderEvent(Map<String, Object> event) {
        if (event == null) return;

        String eventType = stringOf(event.get("eventType"));
        metrics.received(eventType).increment();

        // Only notify on status changes and assignment — skip CREATED noise
        if (!isNotifiable(eventType)) {
            log.debug("Ignoring work-order event type {}", eventType);
            return;
        }

        Long clientId = asLong(event.get("clientId"));
        if (clientId == null) {
            log.warn("work-order event missing clientId eventType={}", eventType);
            metrics.failed(eventType).increment();
            return;
        }

        // Dedupe using clientId+eventType+workOrderId (no UUID from this producer)
        String dedupeKey = clientId + ":" + eventType + ":" + stringOf(event.get("workOrderId"));
        if (!eventDedupe.firstTime(dedupeKey)) {
            log.info("Work-order event already processed key={} — skipping", dedupeKey);
            metrics.deduped(eventType).increment();
            return;
        }

        String status    = stringOf(event.get("status"));
        Long   orderId   = asLong(event.get("workOrderId"));
        String actionUrl = orderId != null ? "/dashboard/orders/" + orderId : null;

        Optional<RecipientLookup.Recipient> recOpt = recipientLookup.findByClientId(clientId);
        String locale = recOpt.map(RecipientLookup.Recipient::safeLocale).orElse("en");

        String title   = title(eventType, status, locale);
        String message = message(eventType, status, orderId, locale);

        Notification notification = Notification.builder()
            .clientId(clientId)
            .type("WORK_ORDER_UPDATE")
            .title(title)
            .message(message)
            .actionUrl(actionUrl)
            .status(Notification.NotificationStatus.SENT)
            .channel("IN_APP")
            .read(false)
            .sentAt(LocalDateTime.now())
            .build();
        notificationRepository.save(notification);

        // WhatsApp on completion only — don't spam opt-in users on every status hop
        if ("WORK_ORDER_STATUS_CHANGED".equals(eventType) && "COMPLETED".equals(status)) {
            recOpt.ifPresent(rec -> {
                if (whatsAppSender != null && rec.whatsappOptIn()
                        && rec.phone() != null && !rec.phone().isBlank()
                        && !rec.notificationsPaused()) {
                    try {
                        whatsAppSender.send(rec.phone(), waBody(orderId, locale));
                    } catch (Exception ex) {
                        log.warn("WhatsApp send failed clientId={}: {}", clientId, ex.getMessage());
                    }
                }
            });
        }

        metrics.processed(eventType).increment();
        log.info("Processed work-order event type={} orderId={} clientId={}", eventType, orderId, clientId);
    }

    private static boolean isNotifiable(String eventType) {
        return "WORK_ORDER_STATUS_CHANGED".equals(eventType)
            || "TECHNICIAN_ASSIGNED".equals(eventType)
            || "SERVICE_REQUEST_APPROVED".equals(eventType)
            || "SERVICE_REQUEST_REJECTED".equals(eventType);
    }

    private static String title(String eventType, String status, String locale) {
        boolean ar = "ar".equalsIgnoreCase(locale);
        return switch (eventType) {
            case "WORK_ORDER_STATUS_CHANGED" -> statusTitle(status, ar);
            case "TECHNICIAN_ASSIGNED"       -> ar ? "تم تعيين فني" : "Technician Assigned";
            case "SERVICE_REQUEST_APPROVED"  -> ar ? "تمت الموافقة على طلبك" : "Service Request Approved";
            case "SERVICE_REQUEST_REJECTED"  -> ar ? "تم رفض طلبك" : "Service Request Rejected";
            default -> ar ? "تحديث الطلب" : "Order Update";
        };
    }

    private static String statusTitle(String status, boolean ar) {
        if (status == null) return ar ? "تحديث الطلب" : "Order Update";
        return switch (status) {
            case "IN_PROGRESS"   -> ar ? "الطلب قيد التنفيذ" : "Work In Progress";
            case "WAITING_PARTS" -> ar ? "بانتظار القطع"    : "Waiting for Parts";
            case "COMPLETED"     -> ar ? "تم إنجاز الطلب"   : "Work Order Completed";
            case "CANCELLED"     -> ar ? "تم إلغاء الطلب"   : "Work Order Cancelled";
            default              -> ar ? "تحديث الطلب"      : "Order Update";
        };
    }

    private static String message(String eventType, String status, Long orderId, String locale) {
        boolean ar = "ar".equalsIgnoreCase(locale);
        String ref = orderId != null ? (ar ? " رقم #" + orderId : " #" + orderId) : "";
        return switch (eventType) {
            case "WORK_ORDER_STATUS_CHANGED" -> statusMessage(status, ref, ar);
            case "TECHNICIAN_ASSIGNED" ->
                ar ? "تم تعيين فني لمعالجة طلبك" + ref + "."
                   : "A technician has been assigned to your order" + ref + ".";
            case "SERVICE_REQUEST_APPROVED" ->
                ar ? "تمت الموافقة على طلب الخدمة" + ref + ". سنتواصل معك قريباً."
                   : "Your service request" + ref + " has been approved. We'll be in touch soon.";
            case "SERVICE_REQUEST_REJECTED" ->
                ar ? "لم نتمكن من قبول طلب الخدمة" + ref + ". يرجى التواصل معنا لمزيد من المعلومات."
                   : "We were unable to accept your service request" + ref + ". Please contact us for more details.";
            default ->
                ar ? "تم تحديث طلبك" + ref + "." : "Your order" + ref + " has been updated.";
        };
    }

    private static String statusMessage(String status, String ref, boolean ar) {
        if (status == null) return ar ? "تم تحديث طلبك" + ref + "." : "Your order" + ref + " has been updated.";
        return switch (status) {
            case "IN_PROGRESS"   ->
                ar ? "بدأ العمل على طلبك" + ref + "." : "Work has started on your order" + ref + ".";
            case "WAITING_PARTS" ->
                ar ? "طلبك" + ref + " بانتظار توفر القطع اللازمة."
                   : "Your order" + ref + " is waiting for parts to be sourced.";
            case "COMPLETED"     ->
                ar ? "تم إنجاز طلبك" + ref + " بنجاح. شكراً لاختيارك Rigoo Marine."
                   : "Your order" + ref + " has been completed. Thank you for choosing Rigoo Marine.";
            case "CANCELLED"     ->
                ar ? "تم إلغاء طلبك" + ref + ". يرجى التواصل معنا لمزيد من المعلومات."
                   : "Your order" + ref + " has been cancelled. Please contact us for details.";
            default ->
                ar ? "تم تحديث حالة طلبك" + ref + " إلى " + status + "."
                   : "Your order" + ref + " status has changed to " + status + ".";
        };
    }

    private static String waBody(Long orderId, String locale) {
        boolean ar = "ar".equalsIgnoreCase(locale);
        String ref = orderId != null ? " #" + orderId : "";
        return ar
            ? "✅ تم إنجاز طلبك" + ref + " بنجاح. شكراً لاختيارك Rigoo Marine."
            : "✅ Your work order" + ref + " is complete. Thank you for choosing Rigoo Marine.";
    }

    private static String stringOf(Object v) { return v == null ? "" : String.valueOf(v); }

    private static Long asLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return null; }
    }
}
