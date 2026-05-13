package com.rigoomarine.client.auth;

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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhoneOtpCleanupJobTest {

    @Mock private PhoneOtpRepository otpRepository;

    private MeterRegistry meterRegistry;
    private PhoneOtpCleanupJob job;

    @BeforeEach
    void setUp() {
        // SimpleMeterRegistry is the no-op real impl — works under Java 23
        // where Mockito's inline mocker rejects Micrometer's class hierarchy.
        meterRegistry = new SimpleMeterRegistry();
        job = new PhoneOtpCleanupJob(otpRepository, meterRegistry);
    }

    @Test
    void run_passesThresholdAndBatchSize_toRepository() {
        when(otpRepository.deleteOlderThan(any(), anyInt())).thenReturn(0);
        LocalDateTime before = LocalDateTime.now().minus(Duration.ofHours(24)).minusSeconds(1);

        job.run();

        ArgumentCaptor<LocalDateTime> threshold = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<Integer> batch = ArgumentCaptor.forClass(Integer.class);
        verify(otpRepository).deleteOlderThan(threshold.capture(), batch.capture());

        // Threshold ≈ now - 24h, within a small jitter envelope around the call.
        LocalDateTime after = LocalDateTime.now().minus(Duration.ofHours(24)).plusSeconds(1);
        assertTrue(threshold.getValue().isAfter(before),
            "threshold should be roughly now-24h, got " + threshold.getValue());
        assertTrue(threshold.getValue().isBefore(after),
            "threshold should be roughly now-24h, got " + threshold.getValue());
        assertEquals(1000, batch.getValue(), "BATCH_SIZE is 1000");
    }

    @Test
    void run_incrementsCounter_whenRowsDeleted() {
        when(otpRepository.deleteOlderThan(any(), anyInt())).thenReturn(42);

        job.run();

        assertEquals(42.0, meterRegistry.counter("otp.cleanup.purged").count(),
            "counter should reflect rows deleted");
    }

    @Test
    void run_doesNotIncrementCounter_whenZeroRowsDeleted() {
        when(otpRepository.deleteOlderThan(any(), anyInt())).thenReturn(0);

        job.run();

        assertEquals(0.0, meterRegistry.counter("otp.cleanup.purged").count(),
            "no rows deleted → no increment → flat dashboard line stays flat");
    }

    @Test
    void run_swallowsRuntimeException_failOpen() {
        when(otpRepository.deleteOlderThan(any(), anyInt()))
            .thenThrow(new RuntimeException("db unavailable"));

        // Must not propagate — the scheduler should retry on next cycle.
        assertDoesNotThrow(() -> job.run());
        assertEquals(0.0, meterRegistry.counter("otp.cleanup.purged").count(),
            "no increment on failed cycle");
    }

    @Test
    void run_doesNotCallRepoWithStaleParameters_acrossInvocations() {
        when(otpRepository.deleteOlderThan(any(), anyInt())).thenReturn(0);

        job.run();
        // Capture the threshold from the first run, then check the second is strictly later.
        ArgumentCaptor<LocalDateTime> cap = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(otpRepository).deleteOlderThan(cap.capture(), anyInt());
        LocalDateTime first = cap.getValue();

        reset(otpRepository);
        when(otpRepository.deleteOlderThan(any(), anyInt())).thenReturn(0);

        // Sleep a tick so the timestamp moves forward observably.
        try { Thread.sleep(5); } catch (InterruptedException ignored) {}

        job.run();
        ArgumentCaptor<LocalDateTime> cap2 = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(otpRepository).deleteOlderThan(cap2.capture(), anyInt());
        LocalDateTime second = cap2.getValue();

        assertTrue(second.isAfter(first),
            "each call computes its own threshold; got first=" + first + " second=" + second);
    }
}
