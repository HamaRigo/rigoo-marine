package com.rigoomarine.client.mail;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailOutboxCleanupJobTest {

    @Mock private EmailOutboxRepository outboxRepository;

    private MeterRegistry meterRegistry;
    private EmailOutboxCleanupJob job;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        job = new EmailOutboxCleanupJob(outboxRepository, meterRegistry);
    }

    @Test
    void run_callsBothPurges_withTheirOwnThresholds_andTheBatchSize() {
        when(outboxRepository.deleteSentOlderThan(any(), anyInt())).thenReturn(0);
        when(outboxRepository.deleteDeadOlderThan(any(), anyInt())).thenReturn(0);

        job.run();

        ArgumentCaptor<LocalDateTime> sentCap = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> deadCap = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<Integer> sentBatch = ArgumentCaptor.forClass(Integer.class);
        ArgumentCaptor<Integer> deadBatch = ArgumentCaptor.forClass(Integer.class);
        verify(outboxRepository).deleteSentOlderThan(sentCap.capture(), sentBatch.capture());
        verify(outboxRepository).deleteDeadOlderThan(deadCap.capture(), deadBatch.capture());

        // SENT threshold ≈ now-7d, DEAD threshold ≈ now-30d; both within a small jitter envelope.
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sentExpected = now.minus(Duration.ofDays(7));
        LocalDateTime deadExpected = now.minus(Duration.ofDays(30));

        assertTrue(within(sentCap.getValue(), sentExpected, 2),
            "SENT threshold should be roughly now-7d, got " + sentCap.getValue());
        assertTrue(within(deadCap.getValue(), deadExpected, 2),
            "DEAD threshold should be roughly now-30d, got " + deadCap.getValue());
        assertEquals(1000, sentBatch.getValue());
        assertEquals(1000, deadBatch.getValue());

        // DEAD threshold is older than SENT — sanity check the retention ordering.
        assertTrue(deadCap.getValue().isBefore(sentCap.getValue()),
            "DEAD cutoff must be older than SENT cutoff (30d > 7d)");
    }

    @Test
    void run_incrementsBothCounters_independently() {
        when(outboxRepository.deleteSentOlderThan(any(), anyInt())).thenReturn(42);
        when(outboxRepository.deleteDeadOlderThan(any(), anyInt())).thenReturn(3);

        job.run();

        assertEquals(42.0, meterRegistry.counter("email_outbox.cleanup.sent.purged").count());
        assertEquals(3.0, meterRegistry.counter("email_outbox.cleanup.dead.purged").count());
    }

    @Test
    void run_skipsCounterIncrement_whenItsCorrespondingPurgeDeletedZero() {
        when(outboxRepository.deleteSentOlderThan(any(), anyInt())).thenReturn(7);
        when(outboxRepository.deleteDeadOlderThan(any(), anyInt())).thenReturn(0);

        job.run();

        assertEquals(7.0, meterRegistry.counter("email_outbox.cleanup.sent.purged").count(),
            "SENT counter increments when SENT rows purged");
        assertEquals(0.0, meterRegistry.counter("email_outbox.cleanup.dead.purged").count(),
            "DEAD counter stays flat when no DEAD rows purged — dashboard line stays clean");
    }

    @Test
    void run_doesNothing_whenBothPurgesReturnZero() {
        when(outboxRepository.deleteSentOlderThan(any(), anyInt())).thenReturn(0);
        when(outboxRepository.deleteDeadOlderThan(any(), anyInt())).thenReturn(0);

        job.run();

        assertEquals(0.0, meterRegistry.counter("email_outbox.cleanup.sent.purged").count());
        assertEquals(0.0, meterRegistry.counter("email_outbox.cleanup.dead.purged").count());
    }

    @Test
    void run_swallowsRuntimeException_failOpen() {
        when(outboxRepository.deleteSentOlderThan(any(), anyInt()))
            .thenThrow(new RuntimeException("db unavailable"));

        // Scheduler must keep running — exception swallowed; next cycle retries.
        assertDoesNotThrow(() -> job.run());
        // DEAD path was never reached because the SENT path threw.
        verify(outboxRepository, never()).deleteDeadOlderThan(any(), anyInt());
        assertEquals(0.0, meterRegistry.counter("email_outbox.cleanup.sent.purged").count());
        assertEquals(0.0, meterRegistry.counter("email_outbox.cleanup.dead.purged").count());
    }

    @Test
    void run_doesNotTouchFailedOrRetryingRows() {
        // Defensive: the contract is "DELETE only touches SENT and DEAD".
        // We can't assert this directly without integration tests against the
        // real query, but we can lock down the repo method names the job calls
        // — any future refactor that adds a deleteFailedOlderThan would have
        // to also wire it in here.
        when(outboxRepository.deleteSentOlderThan(any(), anyInt())).thenReturn(0);
        when(outboxRepository.deleteDeadOlderThan(any(), anyInt())).thenReturn(0);

        job.run();

        // Only the two terminal-status purges should be invoked. If a future
        // refactor adds another purge it should also extend this test.
        verify(outboxRepository, times(1)).deleteSentOlderThan(any(), anyInt());
        verify(outboxRepository, times(1)).deleteDeadOlderThan(any(), anyInt());
        verifyNoMoreInteractions(outboxRepository);
    }

    private static boolean within(LocalDateTime actual, LocalDateTime expected, int seconds) {
        long delta = Math.abs(Duration.between(actual, expected).toSeconds());
        return delta <= seconds;
    }
}
