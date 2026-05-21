package com.rigoomarine.notification.whatsapp;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Meta WhatsApp Business Cloud API webhook.
 *
 * <p>Meta requires two endpoints:
 * <ol>
 *   <li>GET /whatsapp/webhook — one-time verification handshake when the
 *       webhook URL is registered in Meta Business Manager. Meta sends
 *       hub.mode, hub.challenge, and hub.verify_token; the server must
 *       echo back hub.challenge if hub.verify_token matches the configured
 *       secret. Verification is a one-time setup step, not per-message.</li>
 *   <li>POST /whatsapp/webhook — delivery receipts and inbound message events.
 *       We only log status updates (sent/delivered/read/failed) for now;
 *       inbound messages are acknowledged (200) and discarded since Rigoo
 *       Marine sends one-way reminders — clients reply via the app.</li>
 * </ol>
 *
 * <p>Active only when {@code app.whatsapp.provider=meta} so this endpoint
 * is not exposed when Twilio is the configured provider.
 *
 * <p>Security note: the POST handler performs no HMAC-SHA256 signature
 * check yet. Meta sends an {@code X-Hub-Signature-256} header on every
 * delivery; add verification here before processing inbound payloads that
 * trigger business logic.
 */
@Slf4j
@RestController
@RequestMapping("/whatsapp/webhook")
@ConditionalOnExpression(
    "${app.whatsapp.enabled:false} == true " +
    "&& '${app.whatsapp.provider:twilio}'.equals('meta')"
)
public class MetaWebhookController {

    @Value("${app.whatsapp.meta.verify-token:}")
    private String verifyToken;

    /**
     * Webhook verification — called once by Meta when you save the webhook
     * URL in Business Manager.
     *
     * @param mode       must equal "subscribe"
     * @param challenge  echo this back on success
     * @param token      must match {@code app.whatsapp.meta.verify-token}
     */
    @GetMapping
    public ResponseEntity<String> verify(
            @RequestParam("hub.mode")         String mode,
            @RequestParam("hub.challenge")    String challenge,
            @RequestParam("hub.verify_token") String token
    ) {
        if ("subscribe".equals(mode) && token.equals(verifyToken)) {
            log.info("Meta WhatsApp webhook verified successfully");
            return ResponseEntity.ok(challenge);
        }
        log.warn("Meta WhatsApp webhook verification failed — mode={} token_match={}",
            mode, token.equals(verifyToken));
        return ResponseEntity.status(403).body("Forbidden");
    }

    /**
     * Delivery receipts and inbound message events from Meta.
     * Always returns 200 — Meta retries on non-2xx for up to 7 days.
     */
    @PostMapping
    public ResponseEntity<Void> receive(@RequestBody Map<String, Object> payload) {
        try {
            logStatusUpdates(payload);
        } catch (Exception ex) {
            log.warn("Failed to parse Meta webhook payload: {}", ex.getMessage());
        }
        return ResponseEntity.ok().build();
    }

    @SuppressWarnings("unchecked")
    private void logStatusUpdates(Map<String, Object> payload) {
        Object entries = payload.get("entry");
        if (!(entries instanceof Iterable<?> entryList)) return;
        for (Object entry : entryList) {
            if (!(entry instanceof Map<?, ?> entryMap)) continue;
            Object changes = entryMap.get("changes");
            if (!(changes instanceof Iterable<?> changeList)) continue;
            for (Object change : changeList) {
                if (!(change instanceof Map<?, ?> changeMap)) continue;
                Object value = changeMap.get("value");
                if (!(value instanceof Map<?, ?> valueMap)) continue;

                Object statuses = valueMap.get("statuses");
                if (statuses instanceof Iterable<?> statusList) {
                    for (Object s : statusList) {
                        if (!(s instanceof Map<?, ?> sm)) continue;
                        log.info("whatsapp.delivery id={} status={} recipient={}",
                            sm.get("id"), sm.get("status"), mask(String.valueOf(sm.get("recipient_id"))));
                    }
                }

                Object messages = valueMap.get("messages");
                if (messages instanceof Iterable<?> msgList) {
                    for (Object m : msgList) {
                        if (!(m instanceof Map<?, ?> mm)) continue;
                        log.info("whatsapp.inbound from={} type={} — no-op (one-way channel)",
                            mask(String.valueOf(mm.get("from"))), mm.get("type"));
                    }
                }
            }
        }
    }

    private static String mask(String phone) {
        if (phone == null || phone.length() < 8) return "<short>";
        return phone.substring(0, 4) + "****" + phone.substring(phone.length() - 4);
    }
}
