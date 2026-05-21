package com.rigoomarine.workorder.service;

import com.rigoomarine.workorder.repository.WorkOrderRepository;
import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.common.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authorization predicate bean for work-order access.
 *
 * Used as {@code @PreAuthorize("hasRole('ADMIN') or @workOrderSecurity.canAccess(#id)")}.
 *
 * <p>Predicate rules:
 * <ul>
 *   <li>ADMIN — always true</li>
 *   <li>TECHNICIAN — true only when assigned to this work order</li>
 *   <li>CLIENT (and any other authenticated role) — true only when owner</li>
 *   <li>No clientId claim in token — false, with a one-time WARN per email</li>
 * </ul>
 */
@Component("workOrderSecurity")
@RequiredArgsConstructor
@Slf4j
public class WorkOrderSecurity {

    private final WorkOrderRepository workOrderRepository;

    private final Set<String> legacyTokenWarned = ConcurrentHashMap.newKeySet();

    public boolean canAccess(Long workOrderId) {
        if (workOrderId == null) return false;
        Optional<AuthenticatedUser> userOpt = SecurityUtils.currentUser();
        if (userOpt.isEmpty()) return false;
        AuthenticatedUser user = userOpt.get();

        if (user.hasRole("ADMIN") || user.hasRole("TEAM_LEAD")) return true;

        Long actorId = user.getClientId();
        if (actorId == null) {
            warnLegacyTokenOnce(user.getEmail());
            return false;
        }

        if (user.hasRole("TECHNICIAN")) {
            return workOrderRepository.existsByIdAndAssignedTechnicianId(workOrderId, actorId);
        }
        return workOrderRepository.existsByIdAndClientId(workOrderId, actorId);
    }

    private void warnLegacyTokenOnce(String email) {
        if (email != null && legacyTokenWarned.add(email)) {
            log.warn("JWT missing clientId claim for {} — owner-scoped op denied; user must re-login", email);
        }
    }
}
