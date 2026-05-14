package com.rigoomarine.maintenance.client;

import com.rigoomarine.maintenance.exception.VesselLookupUnavailableException;
import com.rigoomarine.maintenance.exception.VesselNotOwnedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/**
 * Cross-service client for vessel-service. Hosts three calls:
 * <ul>
 *   <li>{@link #verifyAccess(Long, Long)} — ownership check (mirrors
 *       work-order-module's VesselOwnershipClient).</li>
 *   <li>{@link #getEngineHours(Long)} — current engine hours for the dossier view.</li>
 *   <li>{@link #updateEngineHours(Long, BigDecimal)} — push a new reading when
 *       a history record carries a higher value.</li>
 * </ul>
 *
 * <p>All three are authenticated by shared secret {@code X-Internal-Api-Token}
 * and go through the {@code lb://vessel-service} Eureka-resolved RestTemplate.
 *
 * <p>Ownership failure modes:
 * <ul>
 *   <li>HTTP 404 → {@link VesselNotOwnedException} (404 + 404 collapse).</li>
 *   <li>anything else (5xx, timeout, network) → {@link VesselLookupUnavailableException}.</li>
 * </ul>
 *
 * <p>Engine-hours getter is permitted to degrade gracefully: callers may catch
 * {@code VesselLookupUnavailableException} and surface a banner instead of
 * failing the whole dossier read.
 */
@Component
@Slf4j
public class VesselClient {

    private static final String BASE = "http://vessel-service";

    private final RestTemplate restTemplate;
    private final String internalToken;

    public VesselClient(
            @LoadBalanced RestTemplate restTemplate,
            @Value("${internal.api-token:rigoo-internal-token-change-in-production}") String internalToken
    ) {
        this.restTemplate = restTemplate;
        this.internalToken = internalToken;
    }

    public void verifyAccess(Long vesselId, Long ownerClientId) {
        if (vesselId == null) throw new VesselNotOwnedException(null);
        if (ownerClientId == null) {
            throw new VesselLookupUnavailableException("ownerClientId not provided", null);
        }

        String url = BASE + "/api/internal/vessels/" + vesselId
            + "/ownership?clientId=" + ownerClientId;

        try {
            restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(internalHeaders()), Void.class);
        } catch (HttpClientErrorException.NotFound nf) {
            throw new VesselNotOwnedException(vesselId);
        } catch (HttpStatusCodeException upstream) {
            log.warn("vessel ownership lookup failed: vesselId={} clientId={} status={}",
                vesselId, ownerClientId, upstream.getStatusCode());
            throw new VesselLookupUnavailableException(
                "vessel-service returned " + upstream.getStatusCode(), upstream);
        } catch (ResourceAccessException network) {
            log.warn("vessel ownership lookup unreachable: vesselId={} clientId={} cause={}",
                vesselId, ownerClientId, network.getMessage());
            throw new VesselLookupUnavailableException("vessel-service unreachable", network);
        }
    }

    /**
     * Reads {@code GET /api/internal/vessels/{id}/engine-hours} → returns
     * {@code {hours, updatedAt}}. Missing vessel → null (dossier renders
     * with engineHours unavailable banner).
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getEngineHours(Long vesselId) {
        String url = BASE + "/api/internal/vessels/" + vesselId + "/engine-hours";
        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(internalHeaders()), Map.class);
            return resp.getBody();
        } catch (HttpClientErrorException.NotFound nf) {
            return null;
        } catch (HttpStatusCodeException upstream) {
            log.warn("engineHours lookup failed: vesselId={} status={}", vesselId, upstream.getStatusCode());
            throw new VesselLookupUnavailableException(
                "vessel-service returned " + upstream.getStatusCode(), upstream);
        } catch (ResourceAccessException network) {
            log.warn("engineHours lookup unreachable: vesselId={} cause={}", vesselId, network.getMessage());
            throw new VesselLookupUnavailableException("vessel-service unreachable", network);
        }
    }

    /**
     * Pushes a new engine-hours reading. Vessel-service guards against regression
     * (the controller validates {@code hours >= currentEngineHours}) — callers
     * therefore should not call this with a lower value.
     */
    public void updateEngineHours(Long vesselId, BigDecimal hours) {
        String url = BASE + "/api/internal/vessels/" + vesselId + "/engine-hours";
        Map<String, Object> body = new HashMap<>();
        body.put("hours", hours);
        try {
            restTemplate.exchange(url, HttpMethod.PATCH, new HttpEntity<>(body, internalHeaders()), Void.class);
        } catch (HttpStatusCodeException upstream) {
            log.warn("engineHours update rejected: vesselId={} status={} body={}",
                vesselId, upstream.getStatusCode(), upstream.getResponseBodyAsString());
            // Don't promote to a user error — propagation handled by the calling service.
            throw new VesselLookupUnavailableException(
                "vessel-service rejected engine-hours update: " + upstream.getStatusCode(), upstream);
        } catch (ResourceAccessException network) {
            throw new VesselLookupUnavailableException("vessel-service unreachable", network);
        }
    }

    private HttpHeaders internalHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Internal-Api-Token", internalToken);
        return headers;
    }

    @Configuration
    static class RestTemplateConfig {
        @Bean
        @LoadBalanced
        public RestTemplate maintenanceVesselRestTemplate() {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(1000);
            factory.setReadTimeout(2000);
            return new RestTemplate(factory);
        }
    }
}
