package com.rigoomarine.gateway.filter;

import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Reactive global filter that rejects any request whose bearer JWT has been
 * server-side revoked (via {@code POST /api/auth/logout}). Revocation entries
 * live in Redis under {@code jwt:revoked:<jti>} with TTL = remaining token
 * lifetime, written by client-service's TokenRevocationService.
 *
 * <p>Behaviour:
 * <ul>
 *   <li>No Authorization header → pass through (unauthenticated routes).</li>
 *   <li>Header present but token unparseable / bad signature → pass through.
 *       Downstream JWT filters will reject with their own 401, keeping
 *       error handling consolidated.</li>
 *   <li>jti claim absent (legacy token, pre-revocation rollout) → pass through.
 *       Logged WARN once per instance.</li>
 *   <li>jti found in Redis → 401 {@code TOKEN_REVOKED}, short-circuit.</li>
 *   <li>Redis lookup fails (connection, timeout) → pass through ("fail open").
 *       Revocation is defense in depth; signature + expiry remain the primary
 *       auth gates. Logged WARN once per instance per outage window.</li>
 * </ul>
 */
@Component
@Slf4j
public class JwtRevocationGlobalFilter implements GlobalFilter, Ordered {

    private static final String AUTH_HEADER = HttpHeaders.AUTHORIZATION;
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String REVOCATION_KEY_PREFIX = "jwt:revoked:";
    private static final Duration REDIS_TIMEOUT = Duration.ofMillis(750);

    private final ReactiveStringRedisTemplate redisTemplate;
    private final SecretKey jwtKey;
    private final AtomicBoolean legacyWarned = new AtomicBoolean(false);
    private final AtomicBoolean redisDownWarned = new AtomicBoolean(false);

    public JwtRevocationGlobalFilter(
            ReactiveStringRedisTemplate redisTemplate,
            @Value("${jwt.secret:rigoo-marine-secret-key-change-in-production-12345}") String secret
    ) {
        this.redisTemplate = redisTemplate;
        this.jwtKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String header = exchange.getRequest().getHeaders().getFirst(AUTH_HEADER);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            return chain.filter(exchange);
        }
        String token = header.substring(BEARER_PREFIX.length()).trim();
        String jti = JwtPeek.readJti(token, jwtKey);
        if (jti == null) {
            return chain.filter(exchange);
        }

        String key = REVOCATION_KEY_PREFIX + jti;
        return redisTemplate.hasKey(key)
                .timeout(REDIS_TIMEOUT)
                .onErrorResume(ex -> {
                    if (redisDownWarned.compareAndSet(false, true)) {
                        log.warn("jwt-revocation.redis_unavailable failing_open cause={}", ex.toString());
                    }
                    return Mono.just(false);
                })
                .flatMap(revoked -> {
                    if (Boolean.TRUE.equals(revoked)) {
                        return reject(exchange);
                    }
                    redisDownWarned.set(false);
                    return chain.filter(exchange);
                });
    }

    private Mono<Void> reject(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"errorCode\":\"TOKEN_REVOKED\",\"message\":\"Session ended; please sign in again\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    /**
     * Run before routing filters so we short-circuit revoked tokens before any
     * downstream forwarding cost. Lower number = higher precedence.
     */
    @Override
    public int getOrder() {
        return -100;
    }
}
