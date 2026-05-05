package com.rigoomarine.notification.kafka;

import com.rigoomarine.notification.mail.EmailTemplateService;
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

    @KafkaListener(topics = "shop.order.status", groupId = "notification-shop-orders")
    public void onShopOrderEvent(Map<String, Object> event) {
        if (event == null) return;
        String type = String.valueOf(event.get("type"));
        if (!"ORDER_PAID".equals(type)) {
            log.debug("Ignoring shop order event type {}", type);
            return;
        }

        String userEmail = stringOf(event.get("userEmail"));
        if (userEmail == null || userEmail.isBlank()) {
            log.warn("ORDER_PAID event missing userEmail — skipping email send");
            return;
        }

        Map<String, String> vars = new HashMap<>();
        vars.put("orderNumber", stringOf(event.get("orderNumber")));
        vars.put("totalQar", stringOf(event.get("totalQar")));
        vars.put("currency", stringOf(event.getOrDefault("currency", "QAR")));
        vars.put("itemCount", stringOf(event.get("itemCount")));

        // Locale: events don't carry per-user preference yet (no preferred_language column —
        // see PAUSE_TASKS deferred i18n work). Default to English; Arabic fallback when that lands.
        emailTemplateService.send("ORDER_PAID", userEmail, "en", vars);
        log.info("Sent ORDER_PAID email to {} for {}", userEmail, vars.get("orderNumber"));
    }

    private static String stringOf(Object v) {
        return v == null ? "" : String.valueOf(v);
    }
}
