package com.rigoomarine.workorder.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Resolves service IDs to display names for the WorkOrderCompletedEvent payload.
 * Calls the public catalog endpoint on service-service via Eureka. The catalog
 * lookup is best-effort: any failure (timeout, 5xx, service down) results in an
 * empty list — the downstream consumer then falls back to mapping from
 * {@code IssueCategory}.
 *
 * <p>Why not cache locally: catalogs are tiny (~10 rows), completions are
 * relatively rare, and admin-edited service names should propagate immediately.
 * The per-call cost is one HTTP round-trip per unique id — negligible.
 *
 * <p>Why two RestTemplate beans: vessel ownership client already declared the
 * Eureka-resolved bean under the name {@code vesselOwnershipRestTemplate}. We
 * reuse that bean here via {@code @LoadBalanced} injection — Spring picks the
 * load-balanced bean by qualifier.
 */
@Component
@Slf4j
public class ServiceCatalogClient {

    private static final String CATALOG_BASE = "http://service-service";

    private final RestTemplate restTemplate;

    public ServiceCatalogClient(@LoadBalanced RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Returns id → name. Missing or failed IDs are simply absent from the map —
     * the caller treats absence as "unmapped" and falls back to OTHER.
     */
    public Map<Long, String> getNames(Set<Long> serviceIds) {
        Map<Long, String> result = new HashMap<>();
        if (serviceIds == null || serviceIds.isEmpty()) return result;

        for (Long id : serviceIds) {
            if (id == null) continue;
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> dto = restTemplate.getForObject(
                    CATALOG_BASE + "/api/services/" + id, Map.class);
                if (dto != null && dto.get("name") != null) {
                    result.put(id, String.valueOf(dto.get("name")));
                }
            } catch (HttpStatusCodeException upstream) {
                log.warn("Service catalog lookup failed for id={} status={}",
                    id, upstream.getStatusCode());
            } catch (ResourceAccessException network) {
                log.warn("Service catalog unreachable for id={}: {}", id, network.getMessage());
                // Whole catalog is likely down — short-circuit so we don't waste
                // 10 timeouts on a single completion event.
                return result;
            }
        }
        return result;
    }

    public List<String> getNamesList(Set<Long> serviceIds) {
        Map<Long, String> map = getNames(serviceIds);
        if (map.isEmpty()) return new ArrayList<>();
        return new ArrayList<>(map.values());
    }

    /**
     * Reuses the load-balanced RestTemplate bean already registered by
     * VesselOwnershipClient. We re-declare it as {@code @ConditionalOnMissingBean}
     * so multiple clients can share one bean without bean-definition clashes.
     */
    @Configuration
    static class RestTemplateConfig {
        @Bean(name = "serviceCatalogRestTemplate")
        @LoadBalanced
        @org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean(RestTemplate.class)
        public RestTemplate serviceCatalogRestTemplate() {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(1000);
            factory.setReadTimeout(2000);
            return new RestTemplate(factory);
        }
    }
}
