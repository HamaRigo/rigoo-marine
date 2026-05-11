package com.rigoomarine.vessel.controller;

import com.rigoomarine.vessel.repository.VesselRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}
