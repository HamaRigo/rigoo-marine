package com.rigoomarine.notification.whatsapp;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Meta WhatsApp Business Cloud API transport.
 *
 * <p>Active when {@code app.whatsapp.enabled=true} AND
 * {@code app.whatsapp.provider=meta}.
 *
 * <p>Architecture:
 * <ul>
 *   <li>Calls {@code POST /{phoneNumberId}/messages} on the Graph API v19.0.</li>
 *   <li>Auth: Bearer access token (System User token or temporary user token
 *       — rotate via Meta Business Manager; the permanent System User token
 *       is the production recommendation).</li>
 *   <li>Free-form text ("type": "text") is used for service-due reminders.
 *       Meta enforces a 24-hour customer-service window for user-initiated
 *       conversations; because service-due reminders are business-initiated
 *       they are sent via approved template messages in production.
 *       For dev/test the provider sends free-form text so no template
 *       approval is required.</li>
 *   <li>Failures log + increment a Micrometer counter but do not propagate —
 *       the caller already persisted in-app + email rows.</li>
 * </ul>
 *
 * <p>Required config (set as env vars in production):
 * <pre>
 *   app.whatsapp.enabled=true
 *   app.whatsapp.provider=meta
 *   app.whatsapp.meta.phone-number-id=&lt;WABA phone number ID&gt;
 *   app.whatsapp.meta.access-token=&lt;System User permanent token&gt;
 *   app.whatsapp.meta.verify-token=&lt;arbitrary secret for webhook verification&gt;
 * </pre>
 */
@Slf4j
@Component
@ConditionalOnExpression(
    "${app.whatsapp.enabled:false} == true " +
    "&& '${app.whatsapp.provider:twilio}'.equals('meta')"
)
public class MetaWhatsAppSender implements WhatsAppPort {

    private static final String GRAPH_API = "https://graph.facebook.com/v19.0";

    private final RestTemplate restTemplate = new RestTemplate();
    private final MeterRegistry meterRegistry;

    @Value("${app.whatsapp.meta.phone-number-id:}")
    private String phoneNumberId;

    @Value("${app.whatsapp.meta.access-token:}")
    private String accessToken;

    public MetaWhatsAppSender(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    /**
     * Send a free-form text message. The phone number is sent as E.164
     * without the leading "+"; Meta accepts both forms but normalises
     * internally — stripping "+" avoids subtle rejection on some WABA
     * accounts.
     */
    @Override
    public void send(String toE164, String body) {
        if (phoneNumberId.isBlank() || accessToken.isBlank()) {
            throw new IllegalStateException(
                "Meta WhatsApp credentials missing: set " +
                "app.whatsapp.meta.{phone-number-id,access-token}");
        }
        if (toE164 == null || toE164.isBlank()) {
            log.warn("meta.whatsapp.send skipped — empty recipient phone");
            return;
        }

        String normalised = stripPlus(toE164);
        String url = GRAPH_API + "/" + phoneNumberId + "/messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);

        Map<String, Object> payload = Map.of(
            "messaging_product", "whatsapp",
            "to",   normalised,
            "type", "text",
            "text", Map.of("preview_url", false, "body", body)
        );

        try {
            restTemplate.postForEntity(url, new HttpEntity<>(payload, headers), String.class);
            log.info("whatsapp.sent provider=meta recipient={}", mask(toE164));
            meterRegistry.counter("notification.whatsapp.sent.total", "provider", "meta").increment();
        } catch (HttpStatusCodeException ex) {
            log.error("whatsapp.failed provider=meta recipient={} status={} body={}",
                mask(toE164), ex.getStatusCode(), ex.getResponseBodyAsString());
            meterRegistry.counter("notification.whatsapp.failed.total", "provider", "meta").increment();
            throw new RuntimeException("Meta Graph API rejected WhatsApp: " + ex.getStatusCode(), ex);
        }
    }

    private static String stripPlus(String phone) {
        return phone.startsWith("+") ? phone.substring(1) : phone;
    }

    private static String mask(String phone) {
        if (phone == null || phone.length() < 8) return "<short>";
        return phone.substring(0, 4) + "****" + phone.substring(phone.length() - 4);
    }
}
