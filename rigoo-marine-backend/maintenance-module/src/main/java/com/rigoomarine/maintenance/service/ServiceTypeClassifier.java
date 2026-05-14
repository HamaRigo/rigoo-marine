package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.entity.ServiceType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Pure-function mapping from catalog service NAMES (or, as a last resort,
 * {@code IssueCategory}) to {@link ServiceType}. Kept as its own component so
 * it's trivially unit-testable and so admin-edited service names can be
 * accommodated by adjusting the keyword map without touching the consumer.
 *
 * <p>Matching is keyword-based and case-insensitive: a service name "Marine
 * Oil Change Premium" still resolves to {@code OIL_CHANGE} via the "oil change"
 * keyword. Unknown names map to {@code OTHER} — never null — so the consumer
 * always produces at least one history row.
 */
@Component
@Slf4j
public class ServiceTypeClassifier {

    /**
     * Ordered keyword → enum lookup. Order matters: more-specific keywords come
     * first so e.g. "antifouling paint" lands on {@code ANTIFOULING} rather than
     * a generic "paint" rule (if such a rule were ever added).
     */
    private static final List<Map.Entry<String, ServiceType>> KEYWORDS = List.of(
        Map.entry("oil change",        ServiceType.OIL_CHANGE),
        Map.entry("antifouling",       ServiceType.ANTIFOULING),
        Map.entry("bottom paint",      ServiceType.ANTIFOULING),
        Map.entry("hull",              ServiceType.HULL_CLEANING),
        Map.entry("propeller",         ServiceType.PROPELLER_SERVICE),
        Map.entry("impeller",          ServiceType.IMPELLER),
        Map.entry("fuel filter",       ServiceType.FUEL_FILTER),
        Map.entry("zinc",              ServiceType.ZINC_ANODES),
        Map.entry("anode",             ServiceType.ZINC_ANODES),
        Map.entry("battery",           ServiceType.BATTERY),
        Map.entry("inspection",        ServiceType.INSPECTION),
        Map.entry("diagnostics",       ServiceType.ENGINE_SERVICE),
        Map.entry("engine",            ServiceType.ENGINE_SERVICE),
        Map.entry("transmission",      ServiceType.ENGINE_SERVICE),
        Map.entry("generator",         ServiceType.ENGINE_SERVICE)
    );

    private static final Map<String, ServiceType> ISSUE_CATEGORY = Map.of(
        "ENGINE",      ServiceType.ENGINE_SERVICE,
        "PROPULSION",  ServiceType.PROPELLER_SERVICE,
        "HULL",        ServiceType.HULL_CLEANING,
        "ELECTRICAL",  ServiceType.OTHER,
        "NAVIGATION",  ServiceType.OTHER,
        "PLUMBING",    ServiceType.OTHER,
        "SAFETY",      ServiceType.INSPECTION,
        "MAINTENANCE", ServiceType.INSPECTION
    );

    /**
     * Classify a single service name. Never returns null — falls back to OTHER.
     */
    public ServiceType classifyName(String serviceName) {
        if (serviceName == null || serviceName.isBlank()) return ServiceType.OTHER;
        String lower = serviceName.toLowerCase(Locale.ROOT);
        for (Map.Entry<String, ServiceType> e : KEYWORDS) {
            if (lower.contains(e.getKey())) return e.getValue();
        }
        return ServiceType.OTHER;
    }

    public ServiceType classifyIssueCategory(String issueCategory) {
        if (issueCategory == null) return ServiceType.OTHER;
        return ISSUE_CATEGORY.getOrDefault(issueCategory.toUpperCase(Locale.ROOT), ServiceType.OTHER);
    }

    /**
     * Top-level classification for a completed WorkOrder. Returns the distinct
     * set of {@code ServiceType}s the event maps to — always at least one entry.
     *
     * @param serviceNames  names from service-service (may be empty/null)
     * @param issueCategory fallback when serviceNames is empty (service-request flow)
     */
    public Set<ServiceType> classify(List<String> serviceNames, String issueCategory) {
        Set<ServiceType> result = new LinkedHashSet<>();
        if (serviceNames != null) {
            for (String name : serviceNames) {
                result.add(classifyName(name));
            }
        }
        if (result.isEmpty()) {
            result.add(classifyIssueCategory(issueCategory));
        }
        return result;
    }
}
