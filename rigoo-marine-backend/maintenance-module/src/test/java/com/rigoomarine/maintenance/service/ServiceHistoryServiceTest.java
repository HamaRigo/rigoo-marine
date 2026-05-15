package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.dto.CreateServiceHistoryRequest;
import com.rigoomarine.maintenance.dto.ServiceHistoryDTO;
import com.rigoomarine.maintenance.entity.ServiceHistoryRecord;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.exception.InvalidEngineHoursException;
import com.rigoomarine.maintenance.repository.ServiceHistoryRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ServiceHistoryServiceTest {

    private static final ZoneId QATAR = ZoneId.of("Asia/Qatar");
    private static final Clock FIXED = Clock.fixed(
        LocalDate.of(2026, 5, 14).atStartOfDay(QATAR).toInstant(), QATAR);

    private ServiceHistoryRecordRepository historyRepo;
    private ServiceScheduleService scheduleService;
    private VesselClient vesselClient;
    private MaintenanceAuditLogger auditLogger;
    private ServiceHistoryService service;

    @BeforeEach
    void setUp() {
        historyRepo = mock(ServiceHistoryRecordRepository.class);
        scheduleService = mock(ServiceScheduleService.class);
        vesselClient = mock(VesselClient.class);
        auditLogger = mock(MaintenanceAuditLogger.class);
        service = new ServiceHistoryService(historyRepo, scheduleService, vesselClient, FIXED, auditLogger);

        when(historyRepo.save(any(ServiceHistoryRecord.class)))
            .thenAnswer(inv -> {
                ServiceHistoryRecord r = inv.getArgument(0);
                r.setId(1L);
                r.setCreatedAt(Instant.now(FIXED));
                return r;
            });
    }

    @Test
    void createOilChange_advancesScheduleAndPushesEngineHours() {
        // Vessel currently at 220h; client logs an OIL_CHANGE at 245h today.
        Map<String, Object> reading = new HashMap<>();
        reading.put("hours", new BigDecimal("220.0"));
        when(vesselClient.getEngineHours(42L)).thenReturn(reading);

        CreateServiceHistoryRequest req = CreateServiceHistoryRequest.builder()
            .serviceType(ServiceType.OIL_CHANGE)
            .performedOn(LocalDate.of(2026, 5, 14))
            .engineHoursAtService(new BigDecimal("245.0"))
            .cost(new BigDecimal("280.00"))
            .currency("qar")
            .notes("Filter + sump")
            .build();

        ServiceHistoryDTO dto = service.create(42L, 7L, req, false);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getCurrency()).isEqualTo("QAR");
        verify(vesselClient).updateEngineHours(eq(42L), eq(new BigDecimal("245.0")));
        verify(scheduleService).advanceAfterService(eq(42L), eq(ServiceType.OIL_CHANGE),
            eq(LocalDate.of(2026, 5, 14)), eq(new BigDecimal("245.0")), eq(new BigDecimal("245.0")));
    }

    @Test
    void create_rejectsEngineHoursRegression() {
        Map<String, Object> reading = new HashMap<>();
        reading.put("hours", new BigDecimal("220.0"));
        when(vesselClient.getEngineHours(42L)).thenReturn(reading);

        CreateServiceHistoryRequest req = CreateServiceHistoryRequest.builder()
            .serviceType(ServiceType.OIL_CHANGE)
            .performedOn(LocalDate.of(2026, 5, 14))
            .engineHoursAtService(new BigDecimal("190.0"))
            .build();

        assertThatThrownBy(() -> service.create(42L, 7L, req, false))
            .isInstanceOf(InvalidEngineHoursException.class)
            .hasMessageContaining("less than current");
        verify(historyRepo, never()).save(any());
        verify(vesselClient, never()).updateEngineHours(any(), any());
    }

    @Test
    void create_backdatedRecordDoesNotPushEngineHours() {
        // Vessel at 500h; client backfills a 100h entry from a year ago.
        Map<String, Object> reading = new HashMap<>();
        reading.put("hours", new BigDecimal("500.0"));
        when(vesselClient.getEngineHours(42L)).thenReturn(reading);

        CreateServiceHistoryRequest req = CreateServiceHistoryRequest.builder()
            .serviceType(ServiceType.OIL_CHANGE)
            .performedOn(LocalDate.of(2025, 5, 14))
            .engineHoursAtService(new BigDecimal("100.0"))
            .build();

        service.create(42L, 7L, req, false);

        verify(vesselClient, never()).updateEngineHours(any(), any());
        ArgumentCaptor<ServiceHistoryRecord> captor = ArgumentCaptor.forClass(ServiceHistoryRecord.class);
        verify(historyRepo).save(captor.capture());
        assertThat(captor.getValue().getEngineHoursAtService()).isEqualByComparingTo("100.0");
    }

    @Test
    void create_rejectsImplausibleJumpUnlessForce() {
        Map<String, Object> reading = new HashMap<>();
        reading.put("hours", new BigDecimal("100.0"));
        when(vesselClient.getEngineHours(42L)).thenReturn(reading);

        CreateServiceHistoryRequest req = CreateServiceHistoryRequest.builder()
            .serviceType(ServiceType.OIL_CHANGE)
            .performedOn(LocalDate.of(2026, 5, 14))
            .engineHoursAtService(new BigDecimal("3500.0"))
            .build();

        assertThatThrownBy(() -> service.create(42L, 7L, req, false))
            .isInstanceOf(InvalidEngineHoursException.class)
            .hasMessageContaining("force=true");

        // With force=true the same payload goes through.
        when(vesselClient.getEngineHours(42L)).thenReturn(reading);
        ServiceHistoryDTO dto = service.create(42L, 7L, req, true);
        assertThat(dto.getId()).isEqualTo(1L);
    }

    @Test
    void create_tolerantToVesselServiceOutage() {
        when(vesselClient.getEngineHours(42L))
            .thenThrow(new com.rigoomarine.maintenance.exception.VesselLookupUnavailableException(
                "down", null));

        CreateServiceHistoryRequest req = CreateServiceHistoryRequest.builder()
            .serviceType(ServiceType.OIL_CHANGE)
            .performedOn(LocalDate.of(2026, 5, 14))
            .engineHoursAtService(new BigDecimal("245.0"))
            .build();

        // Read failure shouldn't block write — but the engine-hours push will
        // then fail loudly, rolling the transaction back.
        doThrow(new com.rigoomarine.maintenance.exception.VesselLookupUnavailableException("down", null))
            .when(vesselClient).updateEngineHours(any(), any());

        assertThatThrownBy(() -> service.create(42L, 7L, req, false))
            .isInstanceOf(com.rigoomarine.maintenance.exception.VesselLookupUnavailableException.class);
    }
}
