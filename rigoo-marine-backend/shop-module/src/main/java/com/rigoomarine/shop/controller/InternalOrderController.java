package com.rigoomarine.shop.controller;

import com.rigoomarine.shop.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Internal endpoint — called by invoice-module's Stripe webhook handler.
 * Authentication is by shared secret header X-Internal-Api-Token; not exposed via gateway.
 *
 * Stripe → invoice-module webhook (signature-verified) → here (token-verified) → mark PAID.
 */
@Slf4j
@RestController
@RequestMapping("/api/internal/orders")
@RequiredArgsConstructor
public class InternalOrderController {

    private final OrderService orderService;

    @Value("${shop.internal-api-token:rigoo-internal-token-change-in-production}")
    private String expectedToken;

    @PostMapping("/checkout-completed")
    public ResponseEntity<Map<String, String>> checkoutCompleted(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-Internal-Api-Token", required = false) String token
    ) {
        if (!expectedToken.equals(token)) {
            log.warn("Internal callback rejected — bad or missing token");
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }
        String sessionId = body.get("stripeSessionId");
        String paymentIntentId = body.get("stripePaymentIntentId");
        if (sessionId == null || sessionId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "stripeSessionId required"));
        }
        orderService.markPaid(sessionId, paymentIntentId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/checkout-cancelled")
    public ResponseEntity<Map<String, String>> checkoutCancelled(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-Internal-Api-Token", required = false) String token
    ) {
        if (!expectedToken.equals(token)) {
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }
        String sessionId = body.get("stripeSessionId");
        if (sessionId == null || sessionId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "stripeSessionId required"));
        }
        orderService.markCancelled(sessionId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
