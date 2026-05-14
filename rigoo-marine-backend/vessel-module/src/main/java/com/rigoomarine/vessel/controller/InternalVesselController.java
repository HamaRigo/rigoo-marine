package com.rigoomarine.vessel.controller;

import com.rigoomarine.vessel.entity.Vessel;
import com.rigoomarine.vessel.repository.VesselRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Service-to-service vessel queries. Not routed through the api-gateway —
 * cluster-internal only. Authentication is via shared secret
 * ({@code X-Internal-Api-Token}); the JWT path used by public endpoints is
 * deliberately bypassed because the caller (e.g. work-order-service) needs to
 * ask ownership questions about clients other than the JWT subject.
 *
 * <p>SecurityConfig permits {@code /api/internal/**}; this controller enforces
 * the token. Pattern mirrors {@code shop-module/InternalOrderController}.
 */
@Slf4j
@RestController
@RequestMapping("/api/internal/vessels")
@RequiredArgsConstructor
public class InternalVesselController {

    private final VesselRepository vesselRepository;

    @Value("${internal.api-token:rigoo-internal-token-change-in-production}")
    private String expectedToken;

    /**
     * Returns 204 if the vessel exists AND belongs to the given clientId,
     * 404 otherwise (the two cases collapse to keep the response cheap and to
     * mirror the leak-prevention policy of the public endpoint).
     */
    @GetMapping("/{vesselId}/ownership")
    public ResponseEntity<Void> ownership(
            @PathVariable Long vesselId,
            @RequestParam Long clientId,
            @RequestHeader(value = "X-Internal-Api-Token", required = false) String token
    ) {
        if (!expectedToken.equals(token)) {
            log.warn("internal.ownership rejected — bad or missing token vesselId={} clientId={}",
                vesselId, clientId);
            return ResponseEntity.status(401).build();
        }
        boolean owned = vesselRepository.existsByIdAndClientId(vesselId, clientId);
        return owned ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    /**
     * Returns the vessel's current engine-hours reading plus the timestamp of
     * the last update. {@code hours} is null when the owner hasn't recorded one
     * yet — the maintenance-service uses this to display a banner inviting
     * them to set an initial reading.
     */
    @GetMapping("/{vesselId}/engine-hours")
    public ResponseEntity<Map<String, Object>> getEngineHours(
            @PathVariable Long vesselId,
            @RequestHeader(value = "X-Internal-Api-Token", required = false) String token
    ) {
        if (!expectedToken.equals(token)) {
            log.warn("internal.engineHours.read rejected — bad token vesselId={}", vesselId);
            return ResponseEntity.status(401).build();
        }
        return vesselRepository.findById(vesselId)
            .map(v -> {
                Map<String, Object> body = new HashMap<>();
                body.put("vesselId", v.getId());
                body.put("hours", v.getCurrentEngineHours());
                body.put("updatedAt", v.getEngineHoursUpdatedAt());
                return ResponseEntity.ok(body);
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Pushes a new engine-hours reading from maintenance-service. Rejects
     * regressions (the maintenance-service should have caught these before
     * calling, but we guard at the source of truth too).
     */
    @Transactional
    @PatchMapping("/{vesselId}/engine-hours")
    public ResponseEntity<Map<String, Object>> updateEngineHours(
            @PathVariable Long vesselId,
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-Internal-Api-Token", required = false) String token
    ) {
        if (!expectedToken.equals(token)) {
            log.warn("internal.engineHours.update rejected — bad token vesselId={}", vesselId);
            return ResponseEntity.status(401).build();
        }
        Object raw = body == null ? null : body.get("hours");
        if (raw == null) {
            return ResponseEntity.badRequest().body(Map.of("errorCode", "INVALID_ENGINE_HOURS", "message", "hours required"));
        }
        BigDecimal next;
        try {
            next = new BigDecimal(raw.toString());
        } catch (NumberFormatException nfe) {
            return ResponseEntity.badRequest().body(Map.of("errorCode", "INVALID_ENGINE_HOURS", "message", "hours not numeric"));
        }
        if (next.signum() < 0) {
            return ResponseEntity.badRequest().body(Map.of("errorCode", "INVALID_ENGINE_HOURS", "message", "hours must be non-negative"));
        }

        Vessel vessel = vesselRepository.findById(vesselId).orElse(null);
        if (vessel == null) return ResponseEntity.notFound().build();

        BigDecimal current = vessel.getCurrentEngineHours();
        if (current != null && next.compareTo(current) < 0) {
            return ResponseEntity.badRequest().body(Map.of(
                "errorCode", "INVALID_ENGINE_HOURS",
                "message", "new reading " + next + " is less than current " + current));
        }
        vessel.setCurrentEngineHours(next);
        vessel.setEngineHoursUpdatedAt(Instant.now());
        vesselRepository.save(vessel);

        Map<String, Object> response = new HashMap<>();
        response.put("vesselId", vessel.getId());
        response.put("hours", vessel.getCurrentEngineHours());
        response.put("updatedAt", vessel.getEngineHoursUpdatedAt());
        return ResponseEntity.ok(response);
    }
}
