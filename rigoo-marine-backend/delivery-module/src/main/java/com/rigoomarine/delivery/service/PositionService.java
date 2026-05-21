package com.rigoomarine.delivery.service;

import com.rigoomarine.delivery.dto.PositionUpdateRequest;
import com.rigoomarine.delivery.entity.DeliveryPosition;
import com.rigoomarine.delivery.repository.DeliveryPositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PositionService {

    private static final String KEY_PREFIX = "delivery:position:";

    private final StringRedisTemplate redis;
    private final DeliveryPositionRepository positionRepository;

    @Value("${app.delivery.position-ttl-seconds:600}")
    private long positionTtlSeconds;

    public void updatePosition(Long techId, PositionUpdateRequest req) {
        String key = KEY_PREFIX + techId;
        String value = req.getLat() + "," + req.getLng() + "," + (req.getAccuracy() != null ? req.getAccuracy() : "");
        redis.opsForValue().set(key, value, Duration.ofSeconds(positionTtlSeconds));

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
        return Map.of(
                "techId", techId,
                "lat", parts[0],
                "lng", parts[1],
                "accuracy", parts.length > 2 ? parts[2] : ""
        );
    }
}
