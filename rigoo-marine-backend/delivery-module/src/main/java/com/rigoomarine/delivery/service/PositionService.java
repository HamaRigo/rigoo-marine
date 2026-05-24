package com.rigoomarine.delivery.service;

import com.rigoomarine.delivery.dto.PositionUpdateRequest;
import com.rigoomarine.delivery.entity.DeliveryPosition;
import com.rigoomarine.delivery.repository.DeliveryPositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PositionService {

    // Redis value format: lat,lng,accuracy,epochMs
    private static final String KEY_PREFIX = "delivery:position:";

    private final StringRedisTemplate redis;
    private final DeliveryPositionRepository positionRepository;

    @Value("${app.delivery.position-ttl-seconds:600}")
    private long positionTtlSeconds;

    public void updatePosition(Long techId, PositionUpdateRequest req) {
        long now = System.currentTimeMillis();
        String key = KEY_PREFIX + techId;
        String acc = req.getAccuracy() != null ? String.valueOf(req.getAccuracy()) : "";
        String value = req.getLat() + "," + req.getLng() + "," + acc + "," + now;
        redis.opsForValue().set(key, value, Duration.ofSeconds(positionTtlSeconds));
        persistAsync(techId, req);
    }

    @Async
    protected void persistAsync(Long techId, PositionUpdateRequest req) {
        DeliveryPosition pos = new DeliveryPosition();
        pos.setTechId(techId);
        pos.setLat(req.getLat());
        pos.setLng(req.getLng());
        pos.setAccuracy(req.getAccuracy());
        positionRepository.save(pos);
    }

    public Map<String, Object> getPosition(Long techId) {
        String key = KEY_PREFIX + techId;
        String value = redis.opsForValue().get(key);
        if (value == null) return null;

        String[] parts = value.split(",", -1);
        String epochMs = parts.length > 3 ? parts[3] : "";
        return Map.of(
                "techId",      techId,
                "lat",         parts[0],
                "lng",         parts[1],
                "accuracy",    parts.length > 2 ? parts[2] : "",
                "recordedAt",  epochMs
        );
    }

    public List<Map<String, Object>> getAllPositions(Collection<Long> techIds) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Long id : techIds) {
            Map<String, Object> pos = getPosition(id);
            if (pos != null) result.add(pos);
        }
        return result;
    }

    /** Last N DB positions for breadcrumb trail (most recent first). */
    public List<Map<String, Object>> getHistory(Long techId, int limit) {
        return positionRepository.findLatestByTechId(techId, limit).stream()
                .<Map<String, Object>>map(p -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("lat",        p.getLat().toPlainString());
                    m.put("lng",        p.getLng().toPlainString());
                    m.put("recordedAt", p.getRecordedAt().toString());
                    return m;
                })
                .toList();
    }
}
