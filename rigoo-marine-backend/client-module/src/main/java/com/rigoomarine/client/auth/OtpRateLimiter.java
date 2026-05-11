package com.rigoomarine.client.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Per-phone rate limit for {@code /otp/request}. Backed by the shared Redis
 * (same instance as the JWT revocation list, just different keys). Per-IP
 * limits are handled at the api-gateway already.
 *
 * <p>Implementation: simple INCR + EXPIRE pattern. Concurrent racers may both
 * see "first increment" but at worst one extra OTP request slips through per
 * phone per window — acceptable.
 *
 * <p>Fails open: if Redis is unreachable, allow the request (logged WARN).
 * Same trade-off as TokenRevocationCheck — the rate limit is one of several
 * layers (gateway IP limit, per-code attempt cap, brute-force resistance via
 * 10⁶-space code).
 */
@Slf4j
@Component
public class OtpRateLimiter {

    private static final String KEY_PREFIX = "otp:rate:";
    private static final int MAX_REQUESTS_PER_WINDOW = 3;
    private static final Duration WINDOW = Duration.ofMinutes(10);

    private final StringRedisTemplate redisTemplate;
    private final AtomicBoolean redisDownWarned = new AtomicBoolean(false);

    public OtpRateLimiter(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
    }

    /**
     * @return true if the request is within the per-phone rate budget; false to deny.
     */
    public boolean allow(String phone) {
        if (phone == null || phone.isBlank() || redisTemplate == null) {
            return true;
        }
        String key = KEY_PREFIX + phone;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redisTemplate.expire(key, WINDOW);
            }
            redisDownWarned.set(false);
            return count == null || count <= MAX_REQUESTS_PER_WINDOW;
        } catch (RuntimeException ex) {
            if (redisDownWarned.compareAndSet(false, true)) {
                log.warn("otp.rate_limit: Redis unreachable, failing open — {}", ex.toString());
            }
            return true;
        }
    }
}
