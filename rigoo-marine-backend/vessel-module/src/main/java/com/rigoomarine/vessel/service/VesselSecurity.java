package com.rigoomarine.vessel.service;

import com.rigoomarine.vessel.repository.VesselRepository;
import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.common.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authorization predicate bean for vessel ownership.
 *
 * Used as {@code @PreAuthorize("hasRole('ADMIN') or @vesselSecurity.canAccess(#id)")}.
 * Returns true for the vessel's owner and for TECHNICIAN (read-all role today —
 * tighten in a follow-up once technician-vessel assignments are modeled).
 */
@Component("vesselSecurity")
@RequiredArgsConstructor
@Slf4j
public class VesselSecurity {

    private final VesselRepository vesselRepository;

    private final Set<String> legacyTokenWarned = ConcurrentHashMap.newKeySet();

    public boolean canAccess(Long vesselId) {
        if (vesselId == null) return false;
        Optional<AuthenticatedUser> userOpt = SecurityUtils.currentUser();
        if (userOpt.isEmpty()) return false;
        AuthenticatedUser user = userOpt.get();

        if (user.hasRole("ADMIN") || user.hasRole("TECHNICIAN")) return true;

        Long clientId = user.getClientId();
        if (clientId == null) {
            warnLegacyTokenOnce(user.getEmail());
            return false;
        }
        return vesselRepository.existsByIdAndClientId(vesselId, clientId);
    }

    public boolean isOwner(Long vesselId) {
        Long clientId = SecurityUtils.currentUser().map(AuthenticatedUser::getClientId).orElse(null);
        if (clientId == null || vesselId == null) return false;
        return vesselRepository.existsByIdAndClientId(vesselId, clientId);
    }

    private void warnLegacyTokenOnce(String email) {
        if (email != null && legacyTokenWarned.add(email)) {
            log.warn("JWT missing clientId claim for {} — owner-scoped op denied; user must re-login", email);
        }
    }
}
