package com.rigoomarine.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Per-service JWT revocation lookup against the shared Redis blacklist
 * (key namespace {@code jwt:revoked:<jti>}). Writers live in client-service's
 * {@code TokenRevocationService}; readers are every service's
 * {@code JwtAuthenticationFilter} plus the gateway's reactive filter.
 *
 * <p>Fails open: any error or absent Redis bean returns {@code false}, so the
 * request continues through the chain. Signature + expiry remain the primary
 * auth gates — revocation is defense in depth.
 *
 * <p>Registered as a bean by {@link CommonSecurityAutoConfiguration} so
 * services don't need to declare {@code @ComponentScan} for this package.
 */
@Slf4j
public class TokenRevocationCheck {

    private static final String KEY_PREFIX = "jwt:revoked:";

    private final StringRedisTemplate redisTemplate;
    private final AtomicBoolean redisDownWarned = new AtomicBoolean(false);

    public TokenRevocationCheck(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
    }

    public boolean isRevoked(String jti) {
        if (jti == null || jti.isBlank() || redisTemplate == null) return false;
        try {
            Boolean exists = redisTemplate.hasKey(KEY_PREFIX + jti);
            redisDownWarned.set(false);
            return Boolean.TRUE.equals(exists);
        } catch (RuntimeException ex) {
            if (redisDownWarned.compareAndSet(false, true)) {
                log.warn("token-revocation: Redis unreachable, failing open — {}", ex.toString());
            }
            return false;
        }
    }
}
