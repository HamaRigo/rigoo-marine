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
    private com.rigoomarine.maintenance.repository.ServiceHistoryAttachmentRepository attachmentRepo;
    private ServiceScheduleService scheduleService;
    private VesselClient vesselClient;
    private MaintenanceAuditLogger auditLogger;
    private ServiceHistoryService service;

    @BeforeEach
    void setUp() {
        historyRepo = mock(ServiceHistoryRecordRepository.class);
        attachmentRepo = mock(com.rigoomarine.maintenance.repository.ServiceHistoryAttachmentRepository.class);
        scheduleService = mock(ServiceScheduleService.class);
        vesselClient = mock(VesselClient.class);
        auditLogger = mock(MaintenanceAuditLogger.class);
        service = new ServiceHistoryService(historyRepo, attachmentRepo, scheduleService, vesselClient, FIXED, auditLogger);

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

    // ─── Attachments ─────────────────────────────────────────────────────────

    @org.junit.jupiter.api.Test
    void addAttachment_persistsRow_whenOwnerAndValidType() {
        ServiceHistoryRecord rec = ServiceHistoryRecord.builder()
            .id(100L).vesselId(42L).clientId(7L)
            .serviceType(ServiceType.OIL_CHANGE)
            .performedOn(LocalDate.of(2026, 5, 14))
            .build();
        when(historyRepo.findById(100L)).thenReturn(java.util.Optional.of(rec));
        when(attachmentRepo.countByServiceHistoryId(100L)).thenReturn(0L);
        when(attachmentRepo.save(any())).thenAnswer(inv -> {
            var a = (com.rigoomarine.maintenance.entity.ServiceHistoryAttachment) inv.getArgument(0);
            a.setId(1L);
            return a;
        });

        var req = com.rigoomarine.maintenance.dto.AddAttachmentRequest.builder()
            .url("https://storage/r1.jpg")
            .filename("receipt.jpg")
            .contentType("image/jpeg")
            .sizeBytes(200_000L)
            .build();

        var dto = service.addAttachment(100L, 7L, false, req);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getContentType()).isEqualTo("image/jpeg");
        org.mockito.ArgumentCaptor<com.rigoomarine.maintenance.entity.ServiceHistoryAttachment> captor =
            org.mockito.ArgumentCaptor.forClass(com.rigoomarine.maintenance.entity.ServiceHistoryAttachment.class);
        verify(attachmentRepo).save(captor.capture());
        // Denormalised clientId mirrors the parent history row.
        assertThat(captor.getValue().getClientId()).isEqualTo(7L);
    }

    @org.junit.jupiter.api.Test
    void addAttachment_rejectsNonOwner_with404Collapse() {
        ServiceHistoryRecord rec = ServiceHistoryRecord.builder()
            .id(100L).vesselId(42L).clientId(7L)
            .serviceType(ServiceType.OIL_CHANGE).performedOn(LocalDate.of(2026, 5, 14))
            .build();
        when(historyRepo.findById(100L)).thenReturn(java.util.Optional.of(rec));

        var req = com.rigoomarine.maintenance.dto.AddAttachmentRequest.builder()
            .url("https://storage/r1.jpg").contentType("image/jpeg").sizeBytes(1000L).build();

        // Caller is client 999, but the record belongs to client 7 — should
        // collapse to NotFound, not leak existence as Forbidden.
        assertThatThrownBy(() -> service.addAttachment(100L, 999L, false, req))
            .isInstanceOf(com.rigoomarine.maintenance.exception.ServiceHistoryNotFoundException.class);
        verify(attachmentRepo, never()).save(any());
    }

    @org.junit.jupiter.api.Test
    void addAttachment_rejectsUnsupportedContentType() {
        ServiceHistoryRecord rec = ServiceHistoryRecord.builder()
            .id(100L).vesselId(42L).clientId(7L)
            .serviceType(ServiceType.OIL_CHANGE).performedOn(LocalDate.of(2026, 5, 14))
            .build();
        when(historyRepo.findById(100L)).thenReturn(java.util.Optional.of(rec));

        var req = com.rigoomarine.maintenance.dto.AddAttachmentRequest.builder()
            .url("https://storage/x.exe").contentType("application/x-msdownload").sizeBytes(1000L).build();

        assertThatThrownBy(() -> service.addAttachment(100L, 7L, false, req))
            .isInstanceOf(com.rigoomarine.maintenance.exception.UnsupportedAttachmentTypeException.class);
        verify(attachmentRepo, never()).save(any());
    }

    @org.junit.jupiter.api.Test
    void addAttachment_rejectsWhenLimitReached() {
        ServiceHistoryRecord rec = ServiceHistoryRecord.builder()
            .id(100L).vesselId(42L).clientId(7L)
            .serviceType(ServiceType.OIL_CHANGE).performedOn(LocalDate.of(2026, 5, 14))
            .build();
        when(historyRepo.findById(100L)).thenReturn(java.util.Optional.of(rec));
        when(attachmentRepo.countByServiceHistoryId(100L)).thenReturn(10L);

        var req = com.rigoomarine.maintenance.dto.AddAttachmentRequest.builder()
            .url("https://storage/r.jpg").contentType("image/jpeg").sizeBytes(1000L).build();

        assertThatThrownBy(() -> service.addAttachment(100L, 7L, false, req))
            .isInstanceOf(com.rigoomarine.maintenance.exception.AttachmentLimitReachedException.class);
        verify(attachmentRepo, never()).save(any());
    }

    @org.junit.jupiter.api.Test
    void attachmentsByHistoryIds_groupsBatchFetchByParent() {
        // Verifies the no-N+1 batch path: one repo call, results
        // grouped by serviceHistoryId for the dossier to stitch in.
        var a1 = com.rigoomarine.maintenance.entity.ServiceHistoryAttachment.builder()
            .id(1L).serviceHistoryId(100L).clientId(7L).url("u1").contentType("image/jpeg").sizeBytes(1L).build();
        var a2 = com.rigoomarine.maintenance.entity.ServiceHistoryAttachment.builder()
            .id(2L).serviceHistoryId(100L).clientId(7L).url("u2").contentType("image/png").sizeBytes(2L).build();
        var a3 = com.rigoomarine.maintenance.entity.ServiceHistoryAttachment.builder()
            .id(3L).serviceHistoryId(101L).clientId(7L).url("u3").contentType("application/pdf").sizeBytes(3L).build();

        when(attachmentRepo.findByServiceHistoryIdIn(java.util.List.of(100L, 101L)))
            .thenReturn(java.util.List.of(a1, a2, a3));

        var grouped = service.attachmentsByHistoryIds(java.util.List.of(100L, 101L));

        assertThat(grouped).hasSize(2);
        assertThat(grouped.get(100L)).hasSize(2);
        assertThat(grouped.get(101L)).hasSize(1);
        verify(attachmentRepo, times(1)).findByServiceHistoryIdIn(any());
    }

    @org.junit.jupiter.api.Test
    void deleteAttachment_collapsesToNotFoundForNonOwner() {
        var a = com.rigoomarine.maintenance.entity.ServiceHistoryAttachment.builder()
            .id(99L).serviceHistoryId(100L).clientId(7L).url("u").contentType("image/jpeg").sizeBytes(1L).build();
        when(attachmentRepo.findById(99L)).thenReturn(java.util.Optional.of(a));

        assertThatThrownBy(() -> service.deleteAttachment(99L, 999L, false))
            .isInstanceOf(com.rigoomarine.maintenance.exception.ServiceHistoryNotFoundException.class);
        verify(attachmentRepo, never()).delete(any());
    }
}
