package com.rigoomarine.workorder.client;

import com.rigoomarine.workorder.exception.VesselLookupUnavailableException;
import com.rigoomarine.workorder.exception.VesselNotOwnedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

/**
 * Cross-service ownership check. Calls vessel-service's internal endpoint
 * {@code GET /api/internal/vessels/{vesselId}/ownership?clientId={ownerClientId}},
 * authenticated by shared {@code X-Internal-Api-Token}.
 *
 * <p>Why an internal endpoint instead of forwarding the user JWT:
 * <ul>
 *   <li>For a CLIENT submitting for self, the caller's clientId IS the owner.
 *       Either approach works equivalently.</li>
 *   <li>For TECHNICIAN/ADMIN submitting on behalf of a client, the caller's JWT
 *       carries the staff identity (and the read-all role short-circuit), so
 *       forwarding the JWT silently passes the check for vessels NOT owned by
 *       the body's clientId. The internal endpoint takes ownerClientId as an
 *       explicit parameter and checks {@code existsByIdAndClientId(vesselId, ownerClientId)},
 *       giving the correct answer regardless of who called.</li>
 * </ul>
 *
 * <p>Behaviour: 204 → ownership confirmed; 404 → not owned (or vessel missing);
 * any other failure → 503 to the submit caller (fail-closed).
 */
@Component
@Slf4j
public class VesselOwnershipClient {

    private static final String VESSEL_SERVICE_BASE = "http://vessel-service";

    private final RestTemplate restTemplate;
    private final String internalToken;

    public VesselOwnershipClient(
            @LoadBalanced RestTemplate restTemplate,
            @Value("${internal.api-token:rigoo-internal-token-change-in-production}") String internalToken
    ) {
        this.restTemplate = restTemplate;
        this.internalToken = internalToken;
    }

    /**
     * Verifies that {@code ownerClientId} actually owns {@code vesselId}.
     * Returns normally if so. Throws {@link VesselNotOwnedException} on 404 or
     * {@link VesselLookupUnavailableException} on any other upstream failure.
     *
     * @param vesselId      the vessel under check; null → VesselNotOwnedException
     * @param ownerClientId the expected owner — the body's effective clientId after
     *                      the WorkOrderService identity override
     */
    public void verifyAccess(Long vesselId, Long ownerClientId) {
        if (vesselId == null) {
            throw new VesselNotOwnedException(null);
        }
        if (ownerClientId == null) {
            // Caller must always know who they're submitting for; missing here is a bug.
            throw new VesselLookupUnavailableException(
                "ownerClientId not provided to ownership check", null);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Internal-Api-Token", internalToken);

        String url = VESSEL_SERVICE_BASE
            + "/api/internal/vessels/" + vesselId
            + "/ownership?clientId=" + ownerClientId;

        try {
            restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Void.class);
            // 2xx → owned.
        } catch (HttpClientErrorException.NotFound nf) {
            throw new VesselNotOwnedException(vesselId);
        } catch (HttpStatusCodeException upstream) {
            // 401 here means the shared token is mis-configured — alarms ops loudly.
            log.warn("vessel ownership lookup failed: vesselId={} clientId={} status={}",
                vesselId, ownerClientId, upstream.getStatusCode());
            throw new VesselLookupUnavailableException(
                "vessel-service returned " + upstream.getStatusCode(), upstream);
        } catch (ResourceAccessException network) {
            log.warn("vessel ownership lookup unreachable: vesselId={} clientId={} cause={}",
                vesselId, ownerClientId, network.getMessage());
            throw new VesselLookupUnavailableException(
                "vessel-service unreachable", network);
        }
    }

    /**
     * Eureka-resolved RestTemplate scoped to ownership checks. Connect/read timeouts
     * cap worst-case latency at 3s.
     */
    @Configuration
    static class RestTemplateConfig {
        @Bean
        @LoadBalanced
        public RestTemplate vesselOwnershipRestTemplate() {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(1000);
            factory.setReadTimeout(2000);
            return new RestTemplate(factory);
        }
    }
}
