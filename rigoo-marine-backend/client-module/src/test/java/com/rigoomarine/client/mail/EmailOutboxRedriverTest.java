package com.rigoomarine.client.mail;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Backoff-curve tests for the redriver. The full schedule + DB-claim flow is
 * exercised by integration tests against a real Postgres (out of scope for
 * this unit suite); here we lock down the pure logic that decides "how long
 * until next attempt" so a future refactor can't silently change the cadence.
 */
class EmailOutboxRedriverTest {

    @Test
    void backoff_followsTheDocumentedSchedule() {
        // attemptNumber here is the NEW redrive_attempts count after incrementing
        // (i.e. 1 means "first redrive just failed; schedule the second").
        assertEquals(5,  EmailOutboxRedriver.backoffMinutes(1));
        assertEquals(10, EmailOutboxRedriver.backoffMinutes(2));
        assertEquals(20, EmailOutboxRedriver.backoffMinutes(3));
        assertEquals(40, EmailOutboxRedriver.backoffMinutes(4));
        assertEquals(60, EmailOutboxRedriver.backoffMinutes(5));
    }

    @Test
    void backoff_capsAtSixtyMinutes_beyondTheCurve() {
        // Defense in depth: even if a row somehow exceeds the configured
        // MAX_REDRIVE_ATTEMPTS without being marked DEAD, the cadence stays
        // bounded — we never schedule a retry farther out than 1h.
        assertEquals(60, EmailOutboxRedriver.backoffMinutes(6));
        assertEquals(60, EmailOutboxRedriver.backoffMinutes(99));
    }

    @Test
    void backoff_handlesZeroAndNegativeGracefully() {
        // Defensive — callers should always pass >=1, but if they don't,
        // we degrade to the shortest interval rather than throwing AIOOB.
        assertEquals(5, EmailOutboxRedriver.backoffMinutes(0));
        assertEquals(5, EmailOutboxRedriver.backoffMinutes(-1));
    }

    @Test
    void maxRedriveAttempts_isFive() {
        // Locked at the documented value so a tweak surfaces in a failing test.
        assertEquals(5, EmailOutboxRedriver.MAX_REDRIVE_ATTEMPTS);
    }
}
