package com.rigoomarine.client.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Locks the pure-logic part of {@link RegisterRateLimiter} — phone-to-prefix
 * extraction. The Redis bucket behaviour (INCR/EXPIRE, fail-open) is exercised
 * by integration tests against a real Redis (out of scope for the unit suite);
 * here we pin the prefix derivation so a future refactor can't change the key
 * shape and silently break shared state with running deployments.
 */
class RegisterRateLimiterTest {

    @Test
    void prefixOf_extractsFirstSixDigits_fromE164() {
        assertEquals("974551", RegisterRateLimiter.prefixOf("+97455123456"));
        assertEquals("971501", RegisterRateLimiter.prefixOf("+971501234567"));
    }

    @Test
    void prefixOf_handlesMissingPlus() {
        // Defensive — libphonenumber always emits E.164 with "+", but if a
        // caller hands us a bare-digit phone we should still produce a prefix.
        assertEquals("974551", RegisterRateLimiter.prefixOf("97455123456"));
    }

    @Test
    void prefixOf_returnsNull_whenInputIsNull() {
        assertNull(RegisterRateLimiter.prefixOf(null));
    }

    @Test
    void prefixOf_returnsNull_whenInputIsShorterThanSixDigits() {
        // Real E.164 phones are 8+ digits. If we ever see something shorter,
        // no prefix can be safely keyed; caller's contract is to allow the
        // request rather than gate on a partial key.
        assertNull(RegisterRateLimiter.prefixOf("+9744"));
        assertNull(RegisterRateLimiter.prefixOf(""));
        assertNull(RegisterRateLimiter.prefixOf("+"));
    }

    @Test
    void prefixOf_handlesExactlySixDigits() {
        assertEquals("974551", RegisterRateLimiter.prefixOf("+974551"));
    }

    @Test
    void prefixOf_isStableAcrossDifferentSuffixes() {
        // The whole point of prefix bucketing: consecutive numbers in the same
        // operator block share a bucket. Lock this in.
        String pA = RegisterRateLimiter.prefixOf("+97455123450");
        String pB = RegisterRateLimiter.prefixOf("+97455123499");
        String pC = RegisterRateLimiter.prefixOf("+97455198888");
        assertEquals(pA, pB);
        assertEquals(pA, pC);
        assertEquals("974551", pA);
    }
}
