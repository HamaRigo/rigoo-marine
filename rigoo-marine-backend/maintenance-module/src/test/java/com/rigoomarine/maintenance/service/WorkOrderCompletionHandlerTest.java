package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.entity.ServiceHistoryRecord;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.exception.VesselLookupUnavailableException;
import com.rigoomarine.maintenance.repository.ServiceHistoryRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WorkOrderCompletionHandlerTest {

    private ServiceHistoryRecordRepository historyRepo;
    private ServiceScheduleService scheduleService;
    private VesselClient vesselClient;
    private ServiceTypeClassifier classifier;
    private WorkOrderCompletionHandler handler;

    @BeforeEach
    void setUp() {
        historyRepo = mock(ServiceHistoryRecordRepository.class);
        scheduleService = mock(ServiceScheduleService.class);
        vesselClient = mock(VesselClient.class);
        classifier = new ServiceTypeClassifier(); // real — small + pure
        handler = new WorkOrderCompletionHandler(historyRepo, scheduleService, classifier, vesselClient);

        when(historyRepo.save(any(ServiceHistoryRecord.class)))
            .thenAnswer(inv -> {
                ServiceHistoryRecord r = inv.getArgument(0);
                r.setId(1L);
                return r;
            });
    }

    @Test
    void createsOneHistoryRowPerDistinctServiceType() {
        Map<String, Object> reading = new HashMap<>();
        reading.put("hours", new BigDecimal("245.0"));
        when(vesselClient.getEngineHours(42L)).thenReturn(reading);

        var event = new WorkOrderCompletionHandler.WorkOrderCompletionEvent(
            100L, 7L, 42L, 99L,
            LocalDateTime.of(2026, 5, 14, 10, 0),
            Set.of(1L, 2L, 3L),
            List.of("Oil Change", "Hull Cleaning", "Engine Diagnostics"),
            null, "Replaced filters too"
        );

        handler.handle(event);

        ArgumentCaptor<ServiceHistoryRecord> captor = ArgumentCaptor.forClass(ServiceHistoryRecord.class);
        verify(historyRepo, times(3)).save(captor.capture());
        var saved = captor.getAllValues();
        assertThat(saved).extracting(ServiceHistoryRecord::getServiceType)
            .containsExactlyInAnyOrder(ServiceType.OIL_CHANGE, ServiceType.HULL_CLEANING, ServiceType.ENGINE_SERVICE);
        // Each carries the WO link + technician + snapshot hours.
        for (var r : saved) {
            assertThat(r.getWorkOrderId()).isEqualTo(100L);
            assertThat(r.getTechnicianId()).isEqualTo(99L);
            assertThat(r.getEngineHoursAtService()).isEqualByComparingTo("245.0");
            assertThat(r.getPerformedOn()).isEqualTo(LocalDate.of(2026, 5, 14));
            assertThat(r.getCurrency()).isEqualTo("QAR");
            assertThat(r.getCost()).isNull();
            assertThat(r.getNotes()).contains("work order #100");
        }
        // Schedule advanced for each type that has a matching scheduled item.
        verify(scheduleService, times(3))
            .advanceAfterService(eq(42L), any(ServiceType.class), eq(LocalDate.of(2026, 5, 14)),
                any(BigDecimal.class), any(BigDecimal.class));
    }

    @Test
    void idempotentOnRedelivery() {
        when(vesselClient.getEngineHours(anyLong())).thenReturn(null);
        when(historyRepo.existsByWorkOrderIdAndServiceType(100L, ServiceType.OIL_CHANGE))
            .thenReturn(true);

        var event = new WorkOrderCompletionHandler.WorkOrderCompletionEvent(
            100L, 7L, 42L, null,
            LocalDateTime.of(2026, 5, 14, 10, 0),
            Set.of(1L),
            List.of("Oil Change"),
            null, null
        );

        handler.handle(event);

        verify(historyRepo, never()).save(any());
        verify(scheduleService, never()).advanceAfterService(any(), any(), any(), any(), any());
    }

    @Test
    void survivesConcurrentInsertRace() {
        when(vesselClient.getEngineHours(anyLong())).thenReturn(null);
        when(historyRepo.existsByWorkOrderIdAndServiceType(anyLong(), any())).thenReturn(false);
        when(historyRepo.save(any())).thenThrow(new DataIntegrityViolationException("uk violation"));

        var event = new WorkOrderCompletionHandler.WorkOrderCompletionEvent(
            100L, 7L, 42L, null,
            LocalDateTime.of(2026, 5, 14, 10, 0),
            Set.of(1L),
            List.of("Oil Change"),
            null, null
        );

        // Should NOT throw — the integrity-violation path is swallowed.
        handler.handle(event);

        verify(scheduleService, never()).advanceAfterService(any(), any(), any(), any(), any());
    }

    @Test
    void fallsBackToIssueCategoryWhenServiceNamesEmpty() {
        when(vesselClient.getEngineHours(anyLong())).thenReturn(null);

        var event = new WorkOrderCompletionHandler.WorkOrderCompletionEvent(
            100L, 7L, 42L, null,
            LocalDateTime.of(2026, 5, 14, 10, 0),
            Set.of(),
            null,
            "ENGINE", null
        );

        handler.handle(event);

        ArgumentCaptor<ServiceHistoryRecord> captor = ArgumentCaptor.forClass(ServiceHistoryRecord.class);
        verify(historyRepo).save(captor.capture());
        assertThat(captor.getValue().getServiceType()).isEqualTo(ServiceType.ENGINE_SERVICE);
    }

    @Test
    void survivesVesselServiceOutage() {
        when(vesselClient.getEngineHours(anyLong()))
            .thenThrow(new VesselLookupUnavailableException("down", null));

        var event = new WorkOrderCompletionHandler.WorkOrderCompletionEvent(
            100L, 7L, 42L, null,
            LocalDateTime.of(2026, 5, 14, 10, 0),
            Set.of(1L),
            List.of("Oil Change"),
            null, null
        );

        handler.handle(event); // must not throw

        ArgumentCaptor<ServiceHistoryRecord> captor = ArgumentCaptor.forClass(ServiceHistoryRecord.class);
        verify(historyRepo).save(captor.capture());
        // engineHoursAtService is left null when vessel-service is down.
        assertThat(captor.getValue().getEngineHoursAtService()).isNull();
    }

    @Test
    void skipsWhenVesselIdMissing() {
        var event = new WorkOrderCompletionHandler.WorkOrderCompletionEvent(
            100L, 7L, null, null,
            LocalDateTime.of(2026, 5, 14, 10, 0),
            Set.of(),
            List.of("Oil Change"),
            null, null
        );

        handler.handle(event);

        verify(historyRepo, never()).save(any());
        verifyNoInteractions(vesselClient);
    }
}
