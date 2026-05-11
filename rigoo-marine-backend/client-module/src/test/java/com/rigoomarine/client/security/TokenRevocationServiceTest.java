package com.rigoomarine.client.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Mockito's inline mocker rejects StringRedisTemplate's class hierarchy under
 * Java 23. We use a tiny hand-rolled fake instead — it captures the (key, value,
 * ttl) tuple the service hands to {@code opsForValue().set(...)} so we can assert
 * on the wire-level interaction.
 *
 * <p>End-to-end Redis behaviour is covered by the integration tests; this suite
 * only locks down the input-validation / no-op contract that the service guarantees
 * before it ever touches Redis.
 */
class TokenRevocationServiceTest {

    private FakeStringRedisTemplate fakeTemplate;
    private TokenRevocationService service;

    @BeforeEach
    void setUp() {
        fakeTemplate = new FakeStringRedisTemplate();
        service = new TokenRevocationService(fakeTemplate);
    }

    @Test
    void revoke_writesKeyWithTtl_whenTokenStillValid() {
        Instant exp = Instant.now().plusSeconds(3600);

        boolean ok = service.revoke("abc-123", exp, "user@x.com");

        assertTrue(ok);
        assertEquals(1, fakeTemplate.writes.size());
        FakeWrite w = fakeTemplate.writes.get("jwt:revoked:abc-123");
        assertNotNull(w);
        assertTrue(w.value.startsWith("user@x.com:"));
        assertTrue(w.ttl.getSeconds() > 3590 && w.ttl.getSeconds() <= 3600,
            "TTL within 10s of token lifetime, got " + w.ttl.getSeconds());
    }

    @Test
    void revoke_isNoOp_whenJtiIsNull() {
        assertFalse(service.revoke(null, Instant.now().plusSeconds(60), "user@x.com"));
        assertTrue(fakeTemplate.writes.isEmpty());
    }

    @Test
    void revoke_isNoOp_whenJtiIsBlank() {
        assertFalse(service.revoke("  ", Instant.now().plusSeconds(60), "user@x.com"));
        assertTrue(fakeTemplate.writes.isEmpty());
    }

    @Test
    void revoke_isNoOp_whenExpiryIsNull() {
        assertFalse(service.revoke("abc", null, "user@x.com"));
        assertTrue(fakeTemplate.writes.isEmpty());
    }

    @Test
    void revoke_isNoOp_whenTokenAlreadyExpired() {
        Instant past = Instant.now().minusSeconds(60);

        assertFalse(service.revoke("abc", past, "user@x.com"));

        assertTrue(fakeTemplate.writes.isEmpty());
    }

    @Test
    void revoke_handlesMissingActor_withPlaceholderValue() {
        Instant exp = Instant.now().plusSeconds(60);

        boolean ok = service.revoke("abc", exp, null);

        assertTrue(ok);
        FakeWrite w = fakeTemplate.writes.get("jwt:revoked:abc");
        assertNotNull(w);
        assertTrue(w.value.startsWith("?:"));
    }

    // ---------- test doubles ----------

    private static final class FakeWrite {
        final String value;
        final Duration ttl;
        FakeWrite(String value, Duration ttl) { this.value = value; this.ttl = ttl; }
    }

    private static final class FakeStringRedisTemplate extends StringRedisTemplate {
        final Map<String, FakeWrite> writes = new HashMap<>();
        private final ValueOperations<String, String> ops = new ValueOperations<>() {
            @Override public void set(String key, String value, long timeout, java.util.concurrent.TimeUnit unit) {
                writes.put(key, new FakeWrite(value, Duration.ofMillis(unit.toMillis(timeout))));
            }
            @Override public void set(String key, String value, Duration timeout) {
                writes.put(key, new FakeWrite(value, timeout));
            }
            @Override public void set(String key, String value) {
                writes.put(key, new FakeWrite(value, Duration.ZERO));
            }
            // Unused operations — return safe defaults so the JVM doesn't NPE if
            // a future refactor accidentally calls one.
            @Override public Boolean setIfAbsent(String k, String v) { return false; }
            @Override public Boolean setIfAbsent(String k, String v, long t, java.util.concurrent.TimeUnit u) { return false; }
            @Override public Boolean setIfAbsent(String k, String v, Duration t) { return false; }
            @Override public Boolean setIfPresent(String k, String v) { return false; }
            @Override public Boolean setIfPresent(String k, String v, long t, java.util.concurrent.TimeUnit u) { return false; }
            @Override public Boolean setIfPresent(String k, String v, Duration t) { return false; }
            @Override public void multiSet(Map<? extends String, ? extends String> m) {}
            @Override public Boolean multiSetIfAbsent(Map<? extends String, ? extends String> m) { return false; }
            @Override public String get(Object k) { return null; }
            @Override public String getAndDelete(String k) { return null; }
            @Override public String getAndExpire(String k, long t, java.util.concurrent.TimeUnit u) { return null; }
            @Override public String getAndExpire(String k, Duration t) { return null; }
            @Override public String getAndPersist(String k) { return null; }
            @Override public String getAndSet(String k, String v) { return null; }
            @Override public java.util.List<String> multiGet(java.util.Collection<String> keys) { return java.util.List.of(); }
            @Override public Long increment(String k) { return 0L; }
            @Override public Long increment(String k, long delta) { return 0L; }
            @Override public Double increment(String k, double delta) { return 0.0; }
            @Override public Long decrement(String k) { return 0L; }
            @Override public Long decrement(String k, long delta) { return 0L; }
            @Override public Integer append(String k, String v) { return 0; }
            @Override public String get(String k, long start, long end) { return null; }
            @Override public void set(String k, String v, long offset) {}
            @Override public Long size(String k) { return 0L; }
            @Override public Boolean setBit(String k, long offset, boolean v) { return false; }
            @Override public Boolean getBit(String k, long offset) { return false; }
            @Override public java.util.List<Long> bitField(String k, org.springframework.data.redis.connection.BitFieldSubCommands sub) { return java.util.List.of(); }
            @Override public org.springframework.data.redis.core.RedisOperations<String, String> getOperations() { return null; }
        };
        @Override public ValueOperations<String, String> opsForValue() { return ops; }
        @Override public RedisConnectionFactory getConnectionFactory() { return null; }
    }
}
