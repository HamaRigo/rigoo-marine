package com.rigoomarine.invoice.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Calls shop-service's internal endpoints when a SHOP-source Stripe event arrives.
 * Discovered via Eureka — `lb://shop-service` resolves through Spring Cloud LoadBalancer.
 *
 * Authenticated via shared X-Internal-Api-Token header. Never exposed via the gateway.
 */
@Slf4j
@Component
public class ShopCallbackClient {

    private final RestTemplate restTemplate;
    private final String internalToken;

    public ShopCallbackClient(
            @LoadBalanced RestTemplate restTemplate,
            @Value("${shop.internal-api-token:rigoo-internal-token-change-in-production}") String internalToken
    ) {
        this.restTemplate = restTemplate;
        this.internalToken = internalToken;
    }

    public void notifyCheckoutCompleted(String stripeSessionId, String paymentIntentId) {
        callShop("/api/internal/orders/checkout-completed", Map.of(
                "stripeSessionId", stripeSessionId,
                "stripePaymentIntentId", paymentIntentId == null ? "" : paymentIntentId
        ));
    }

    public void notifyCheckoutCancelled(String stripeSessionId) {
        callShop("/api/internal/orders/checkout-cancelled", Map.of(
                "stripeSessionId", stripeSessionId
        ));
    }

    private void callShop(String path, Map<String, String> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Api-Token", internalToken);
        try {
            ResponseEntity<String> resp = restTemplate.exchange(
                    "http://shop-service" + path,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class);
            log.info("shop callback {} → {}", path, resp.getStatusCode());
        } catch (Exception e) {
            // Re-throw so the webhook handler returns 5xx to Stripe and we get a retry.
            log.error("shop callback {} failed: {}", path, e.getMessage());
            throw new RuntimeException("shop callback failed", e);
        }
    }

    /** RestTemplate bean used here, scoped to this client's Eureka discovery. */
    @Configuration
    static class RestTemplateConfig {
        @Bean
        @LoadBalanced
        public RestTemplate loadBalancedRestTemplate() {
            return new RestTemplate();
        }
    }
}
