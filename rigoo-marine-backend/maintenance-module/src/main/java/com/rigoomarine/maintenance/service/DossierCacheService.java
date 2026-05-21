package com.rigoomarine.maintenance.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rigoomarine.maintenance.dto.VesselMaintenanceSummaryDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.function.Supplier;

/**
 * Cache-aside wrapper for the vessel maintenance dossier.
 *
 * Key:  maint:dossier:{vesselId}
 * TTL:  300 seconds (5 minutes)
 * Store: Redis DB 1 (shared with JWT revocation — same Spring Data Redis template)
 *
 * Eviction is always best-effort: if Redis is unreachable the read path falls
 * through to the DB supplier and the write path logs a warning.  The service
 * remains fully functional without Redis.
 *
 * No dependency on VesselMaintenanceService — callers pass the DB loader as a
 * Supplier so this bean stays free of circular wiring.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DossierCacheService {

    static final String KEY_PREFIX = "maint:dossier:";
    static final Duration TTL = Duration.ofSeconds(300);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Returns the cached dossier for {@code vesselId}, or calls {@code loader}
     * on a cache miss, stores the result, and returns it.
     */
    public VesselMaintenanceSummaryDTO getOrLoad(Long vesselId,
                                                  Supplier<VesselMaintenanceSummaryDTO> loader) {
        String key = KEY_PREFIX + vesselId;
        try {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                log.debug("dossier cache HIT vesselId={}", vesselId);
                return objectMapper.readValue(cached, VesselMaintenanceSummaryDTO.class);
            }
        } catch (Exception e) {
            log.warn("dossier cache read failed vesselId={} — falling through to DB", vesselId, e);
        }

        log.debug("dossier cache MISS vesselId={}", vesselId);
        VesselMaintenanceSummaryDTO dossier = loader.get();

        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(dossier), TTL);
        } catch (Exception e) {
            log.warn("dossier cache write failed vesselId={} — result still served from DB", vesselId, e);
        }
        return dossier;
    }

    /** Removes the cached dossier so the next read rebuilds from the DB. */
    public void evict(Long vesselId) {
        if (vesselId == null) return;
        try {
            redisTemplate.delete(KEY_PREFIX + vesselId);
            log.debug("dossier cache EVICTED vesselId={}", vesselId);
        } catch (Exception e) {
            log.warn("dossier cache evict failed vesselId={}", vesselId, e);
        }
    }
}
