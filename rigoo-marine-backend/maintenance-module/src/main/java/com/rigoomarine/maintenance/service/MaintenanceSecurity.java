package com.rigoomarine.maintenance.service;

import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.exception.VesselNotOwnedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Ownership guard for maintenance endpoints. ADMIN/TECHNICIAN/TEAM_LEAD bypass;
 * everyone else must own the vessel. Mirrors {@code WorkOrderSecurity} /
 * {@code VesselSecurity} but called imperatively from controllers (the maintenance
 * endpoints take vesselId as a path variable, not the maintenance entity id, so
 * SpEL-based {@code @PreAuthorize} predicates don't help us in the schedule/history flow).
 */
@Component("maintenanceSecurity")
@RequiredArgsConstructor
@Slf4j
public class MaintenanceSecurity {

    private final VesselClient vesselClient;

    /**
     * Asserts the current caller may act on the vessel. ADMIN/TECHNICIAN are
     * always granted (read-all). Other roles must own the vessel — verified by
     * a synchronous call to vessel-service. Throws {@link VesselNotOwnedException}
     * on failure (mapped to 404 by the exception handler to avoid id-existence leak).
     *
     * @return the clientId the caller acts as. For owners this is their JWT
     *         clientId; for ADMIN/TECHNICIAN it's the vessel's actual owner
     *         (looked up via {@code VesselClient} in callers that need it —
     *         here we return the caller's clientId, which is what history rows
     *         get denormalised against).
     */
    public Long assertCanActOnVessel(Long vesselId) {
        AuthenticatedUser user = SecurityUtils.currentUser()
            .orElseThrow(() -> new VesselNotOwnedException(vesselId));

        if (user.hasRole("ADMIN") || user.hasRole("TECHNICIAN") || user.hasRole("TEAM_LEAD")) {
            // Staff acting on behalf of a client; the controller layer will
            // populate clientId from the vessel ownership lookup if needed.
            // For now return null so callers know to resolve via VesselClient.
            return user.getClientId();
        }

        Long clientId = user.getClientId();
        if (clientId == null) {
            log.warn("Legacy token (no clientId claim) — denying owner-scoped op for {}", user.getEmail());
            throw new VesselNotOwnedException(vesselId);
        }
        vesselClient.verifyAccess(vesselId, clientId);
        return clientId;
    }

    public boolean isAdminOrTechnician() {
        return SecurityUtils.currentUser()
            .map(u -> u.hasRole("ADMIN") || u.hasRole("TECHNICIAN") || u.hasRole("TEAM_LEAD"))
            .orElse(false);
    }
}
