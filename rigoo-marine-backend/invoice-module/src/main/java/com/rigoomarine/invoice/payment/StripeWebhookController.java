package com.rigoomarine.invoice.payment;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Stripe webhook endpoint.
 *
 * Validates signature, persists event.id for idempotency, dispatches by event type
 * and metadata.source. SHOP events relay to shop-service via {@link ShopCallbackClient}.
 * Boat-deposit events (Phase 3) handled here directly when wired.
 */
@Slf4j
@RestController
@RequestMapping("/api/payments/webhooks")
@RequiredArgsConstructor
public class StripeWebhookController {

    private final ProcessedStripeEventRepository processedEvents;
    private final ShopCallbackClient shopCallbackClient;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @PostMapping(value = "/stripe", consumes = MediaType.ALL_VALUE)
    public ResponseEntity<String> handleStripe(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader
    ) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("Stripe webhook hit but STRIPE_WEBHOOK_SECRET not configured — rejecting");
            return ResponseEntity.status(503).body("webhook secret not configured");
        }
        if (sigHeader == null) {
            return ResponseEntity.badRequest().body("missing Stripe-Signature");
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body("invalid signature");
        }

        // Idempotency — first line of every handler. Insert wins-or-skips.
        try {
            processedEvents.save(ProcessedStripeEvent.builder()
                    .eventId(event.getId())
                    .eventType(event.getType())
                    .build());
        } catch (DataIntegrityViolationException dup) {
            log.info("Stripe event {} already processed — idempotent ack", event.getId());
            return ResponseEntity.ok("duplicate ack");
        }

        log.info("Stripe event received: id={} type={} livemode={}",
                event.getId(), event.getType(), event.getLivemode());

        try {
            switch (event.getType()) {
                case "checkout.session.completed" -> handleCheckoutCompleted(event);
                case "checkout.session.expired", "payment_intent.payment_failed" -> handleCheckoutFailed(event);
                case "charge.refunded" -> log.debug("charge.refunded — Phase 3 refund flow not wired yet");
                default -> log.debug("Stripe event type {} unhandled", event.getType());
            }
        } catch (RuntimeException e) {
            // Stripe retries on 5xx. Idempotency table will skip the dup on retry success.
            log.error("Stripe event {} processing failed: {}", event.getId(), e.getMessage());
            // Roll back the idempotency row so the retry actually re-runs the handler.
            processedEvents.deleteById(event.getId());
            return ResponseEntity.status(500).body("processing failed");
        }

        return ResponseEntity.ok("ok");
    }

    private void handleCheckoutCompleted(Event event) {
        Session session = extractSession(event);
        if (session == null) return;
        Map<String, String> metadata = session.getMetadata();
        String source = metadata == null ? null : metadata.get("source");
        if ("SHOP".equals(source)) {
            shopCallbackClient.notifyCheckoutCompleted(session.getId(), session.getPaymentIntent());
        } else {
            log.debug("checkout.session.completed source={} — no handler wired (Phase 3 boat deposit)", source);
        }
    }

    private void handleCheckoutFailed(Event event) {
        StripeObject obj = event.getDataObjectDeserializer().getObject().orElse(null);
        if (obj instanceof Session session) {
            Map<String, String> metadata = session.getMetadata();
            String source = metadata == null ? null : metadata.get("source");
            if ("SHOP".equals(source)) {
                shopCallbackClient.notifyCheckoutCancelled(session.getId());
            }
        } else if (obj instanceof PaymentIntent pi) {
            // PaymentIntent failures can carry metadata too, but Checkout sessions are our primary hook.
            log.debug("payment_intent.payment_failed for pi={} — no direct order link (use session.expired path)",
                    pi.getId());
        }
    }

    private Session extractSession(Event event) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        StripeObject obj = deserializer.getObject().orElse(null);
        if (obj instanceof Session session) return session;
        log.warn("Could not deserialize Session from event {}", event.getId());
        return null;
    }
}
