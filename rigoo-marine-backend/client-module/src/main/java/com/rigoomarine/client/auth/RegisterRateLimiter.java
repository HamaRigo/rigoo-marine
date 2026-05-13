package com.rigoomarine.client.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Per-phone-prefix rate limit on {@code /auth/register}. Bucket key is the
 * first 6 digits of the E.164-normalized phone (e.g., {@code 974551} for any
 * Qatari mobile starting with {@code 55}), so a "numbering walk" attack that
 * registers consecutive numbers within one operator block trips fast — even if
 * the attacker rotates IPs to evade the gateway's per-IP limit.
 *
 * <p>Budget: {@value #MAX_REQUESTS_PER_WINDOW} registrations per
 * {@link #WINDOW}. Calibrated so a small in-person team (under 10 people on
 * the same operator block) can register together, but a thousand-account
 * numbering walk is blocked within minutes.
 *
 * <p>Fails open if Redis is unreachable — same trade-off as
 * {@code OtpRateLimiter} and {@code TokenRevocationCheck}: rate limiting is
 * defense in depth, never the primary auth gate.
 */
@Slf4j
@Component
public class RegisterRateLimiter {

    private static final String KEY_PREFIX = "register:rate:phone-prefix:";
    private static final int MAX_REQUESTS_PER_WINDOW = 10;
    private static final Duration WINDOW = Duration.ofHours(1);
    private static final int PREFIX_DIGITS = 6;

    private final StringRedisTemplate redisTemplate;
    private final AtomicBoolean redisDownWarned = new AtomicBoolean(false);

    public RegisterRateLimiter(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
    }

    /**
     * @param normalizedPhone E.164 phone after libphonenumber, e.g. {@code +97455123456}
     * @return true if the request fits within the per-phone-prefix budget;
     *         false to deny with 429. Returns true (fail-open) on any Redis
     *         error or when the phone is too short to extract a prefix.
     */
    public boolean allow(String normalizedPhone) {
        if (redisTemplate == null) return true;

        String prefix = prefixOf(normalizedPhone);
        if (prefix == null) return true;

        String key = KEY_PREFIX + prefix;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redisTemplate.expire(key, WINDOW);
            }
            redisDownWarned.set(false);
            return count == null || count <= MAX_REQUESTS_PER_WINDOW;
        } catch (RuntimeException ex) {
            if (redisDownWarned.compareAndSet(false, true)) {
                log.warn("register.rate_limit: Redis unreachable, failing open — {}", ex.toString());
            }
            return true;
        }
    }

    /**
     * Extracts the first {@value #PREFIX_DIGITS} digits after the leading {@code +}.
     * Returns null if the input is null, short, or not E.164-shaped — caller
     * treats that as "no prefix to gate on" and allows the request.
     */
    public static String prefixOf(String normalizedPhone) {
        if (normalizedPhone == null) return null;
        String digits = normalizedPhone.startsWith("+") ? normalizedPhone.substring(1) : normalizedPhone;
        if (digits.length() < PREFIX_DIGITS) return null;
        return digits.substring(0, PREFIX_DIGITS);
    }
}
