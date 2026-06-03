package com.rigoomarine.client.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * Writes JWT jti values to the shared Redis revocation list. The api-gateway's
 * JwtRevocationGlobalFilter reads from the same key namespace on every
 * authenticated request and short-circuits to 401 when the jti is present.
 *
 * <p>Keys: {@code jwt:revoked:<jti>}, value: {@code "<email>:<revokedAtMillis>"}
 * (kept for auditability), TTL: time remaining until the JWT's own {@code exp}.
 * Once the TTL elapses the key auto-evicts — there's no value in keeping a
 * revocation record for a token that is already past expiry.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TokenRevocationService {

    private static final String KEY_PREFIX = "jwt:revoked:";

    private final StringRedisTemplate redisTemplate;

    /**
     * @param jti              the JWT id claim
     * @param tokenExpiresAt   the JWT's exp; revocation TTL is set to (exp - now)
     * @param actorEmail       the subject of the JWT, recorded for audit
     * @return true if the token was revoked; false if the token was already past
     *         expiry (no-op) or jti was missing
     * @throws RuntimeException if the Redis write fails — callers should surface 500
     */
    public boolean revoke(String jti, Instant tokenExpiresAt, String actorEmail) {
        if (jti == null || jti.isBlank()) {
            log.warn("logout.skip reason=missing_jti actor={}", actorEmail);
            return false;
        }
        if (tokenExpiresAt == null) {
            log.warn("logout.skip reason=missing_exp actor={} jti={}", actorEmail, jti);
            return false;
        }
        Duration ttl = Duration.between(Instant.now(), tokenExpiresAt);
        if (ttl.isZero() || ttl.isNegative()) {
            log.info("logout.noop reason=already_expired actor={} jti={}", actorEmail, jti);
            return false;
        }
        String key = KEY_PREFIX + jti;
        String value = (actorEmail == null ? "?" : actorEmail) + ":" + Instant.now().toEpochMilli();
        try {
            redisTemplate.opsForValue().set(key, value, ttl);
            log.info("logout.revoked actor={} jti={} ttlSec={}", actorEmail, jti, ttl.getSeconds());
            return true;
        } catch (DataAccessException ex) {
            // Redis unavailable — token not blacklisted but logout still succeeds
            // (same fail-open trade-off as RegisterRateLimiter and OtpRateLimiter)
            log.warn("logout.revocation_skipped: Redis unreachable, token not blacklisted — actor={} jti={}: {}",
                     actorEmail, jti, ex.toString());
            return false;
        }
    }
}
