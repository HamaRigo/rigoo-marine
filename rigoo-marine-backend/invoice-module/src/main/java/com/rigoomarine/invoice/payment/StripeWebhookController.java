package com.rigoomarine.invoice.payment;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Stripe webhook endpoint — Phase 0 scaffold.
 *
 * Handlers are stubs that log; Phase 2 wires them to listing reservations,
 * rental bookings, and shop orders.
 *
 * Configure via env:
 *   STRIPE_WEBHOOK_SECRET   — `whsec_…` from Stripe dashboard / Stripe CLI.
 *   STRIPE_SECRET_KEY       — `sk_test_…` (used by future API calls; not by this controller).
 *
 * The endpoint is public (no JWT) — Stripe authenticates via the `Stripe-Signature` header
 * which we verify with Webhook.constructEvent(...).
 */
@Slf4j
@RestController
@RequestMapping("/api/payments/webhooks")
public class StripeWebhookController {

    private final String webhookSecret;

    public StripeWebhookController(
            @Value("${stripe.webhook-secret:}") String webhookSecret
    ) {
        this.webhookSecret = webhookSecret;
    }

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

        // Phase 0 scaffold: log and ack. Real handlers wire up in Phase 2.
        log.info("Stripe event received: id={} type={} livemode={}",
                event.getId(), event.getType(), event.getLivemode());

        switch (event.getType()) {
            case "payment_intent.succeeded" ->
                    log.debug("TODO Phase 2: mark reservation/booking/order as PAID");
            case "payment_intent.payment_failed" ->
                    log.debug("TODO Phase 2: notify user + restock");
            case "charge.refunded" ->
                    log.debug("TODO Phase 2: refund flow");
            case "checkout.session.completed" ->
                    log.debug("TODO Phase 2: complete checkout (deposit / booking / order)");
            default -> log.debug("Stripe event type {} unhandled", event.getType());
        }

        return ResponseEntity.ok("ok");
    }
}
