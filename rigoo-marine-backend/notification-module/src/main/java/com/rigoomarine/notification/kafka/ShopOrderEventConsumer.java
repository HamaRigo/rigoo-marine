package com.rigoomarine.notification.kafka;

import com.rigoomarine.notification.mail.EmailTemplateService;
import com.rigoomarine.notification.recipient.RecipientLookup;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Consumes shop.order.status events emitted by shop-module's OrderEventPublisher.
 *
 * For ORDER_PAID, looks up the bilingual ORDER_PAID template and sends the customer
 * a confirmation email. Routes through LogMailSender until SMTP creds are provisioned
 * (one env-var flip — code path is already wired).
 *
 * Spring's JsonDeserializer hands us the event as a Map (no shop-module class on classpath).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ShopOrderEventConsumer {

    private final EmailTemplateService emailTemplateService;
    private final RecipientLookup recipientLookup;
    private final EventDedupe eventDedupe;
    private final NotificationMetrics metrics;

    @KafkaListener(topics = "shop.order.status", groupId = "notification-shop-orders")
    public void onShopOrderEvent(Map<String, Object> event) {
        if (event == null) return;
        String type = String.valueOf(event.get("type"));
        // Counter is keyed by the event's own type so non-ORDER_PAID rows
        // are still visible in the receive count — useful for "are we
        // dropping types we should be handling?" investigations.
        metrics.received(type).increment();
        if (!"ORDER_PAID".equals(type)) {
            log.debug("Ignoring shop order event type {}", type);
            return;
        }
        // Redis-backed dedupe — guards against Kafka redelivery firing the
        // ORDER_PAID email twice. Shop-module's OrderEventPublisher attaches
        // a UUID-shaped eventId; missing/blank id falls through (see
        // EventDedupe javadoc).
        String eventId = stringOf(event.get("eventId"));
        if (!eventDedupe.firstTime(eventId)) {
            log.info("Shop event eventId={} already processed — skipping redelivery", eventId);
            metrics.deduped(type).increment();
            return;
        }

        String userEmail = stringOf(event.get("userEmail"));
        if (userEmail == null || userEmail.isBlank()) {
            log.warn("ORDER_PAID event missing userEmail — skipping email send");
            metrics.failed(type).increment();
            return;
        }

        Map<String, String> vars = new HashMap<>();
        vars.put("orderNumber", stringOf(event.get("orderNumber")));
        vars.put("totalQar", stringOf(event.get("totalQar")));
        vars.put("currency", stringOf(event.getOrDefault("currency", "QAR")));
        vars.put("itemCount", stringOf(event.get("itemCount")));

        // Recipient-aware send when we can resolve the user — gives us
        // paused-check + unsubscribe footer. Falls back to the legacy
        // signature for the "no matching client row" edge case (genuinely
        // anonymous-feeling — we still want to confirm the order).
        recipientLookup.findByEmail(userEmail).ifPresentOrElse(
            rec -> emailTemplateService.send("ORDER_PAID", rec, vars),
            () -> emailTemplateService.send("ORDER_PAID", userEmail, "en", vars)
        );
        metrics.processed("ORDER_PAID").increment();
        log.info("Sent ORDER_PAID email to {} for {}", userEmail, vars.get("orderNumber"));
    }

    private static String stringOf(Object v) {
        return v == null ? "" : String.valueOf(v);
    }
}
