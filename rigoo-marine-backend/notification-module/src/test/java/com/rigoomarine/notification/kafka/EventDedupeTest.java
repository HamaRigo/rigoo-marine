package com.rigoomarine.notification.kafka;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EventDedupeTest {

    private StringRedisTemplate redis;
    private ValueOperations<String, String> ops;
    private EventDedupe dedupe;

    @BeforeEach
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        dedupe = new EventDedupe(redis);
        ReflectionTestUtils.setField(dedupe, "dedupeTtlHours", 24L);
    }

    @Test
    void firstTime_returnsTrue_whenSetNxSucceeds() {
        when(ops.setIfAbsent(eq("notif:event:abc"), eq("1"), any(Duration.class)))
            .thenReturn(true);

        assertThat(dedupe.firstTime("abc")).isTrue();
    }

    @Test
    void firstTime_returnsFalse_whenSetNxFindsExistingKey() {
        when(ops.setIfAbsent(anyString(), anyString(), any(Duration.class)))
            .thenReturn(false);

        assertThat(dedupe.firstTime("abc")).isFalse();
    }

    @Test
    void firstTime_failsOpen_whenRedisThrows() {
        when(ops.setIfAbsent(anyString(), anyString(), any(Duration.class)))
            .thenThrow(new RuntimeException("connection refused"));

        // Fail-open: prefer occasional duplicates over silent drops during a
        // Redis outage. Documented in EventDedupe javadoc.
        assertThat(dedupe.firstTime("abc")).isTrue();
    }

    @Test
    void firstTime_failsOpen_whenSetNxReturnsNull() {
        // setIfAbsent can return null on connection-level errors that don't
        // raise an exception. Same fail-open contract.
        when(ops.setIfAbsent(anyString(), anyString(), any(Duration.class)))
            .thenReturn(null);

        assertThat(dedupe.firstTime("abc")).isTrue();
    }

    @Test
    void firstTime_skipsRedis_whenEventIdNull() {
        assertThat(dedupe.firstTime(null)).isTrue();
        assertThat(dedupe.firstTime("")).isTrue();
        assertThat(dedupe.firstTime("   ")).isTrue();
        verify(ops, never()).setIfAbsent(anyString(), anyString(), any(Duration.class));
    }
}
