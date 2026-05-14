package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.dto.ServiceScheduleDTO;
import com.rigoomarine.maintenance.dto.UpsertScheduleRequest;
import com.rigoomarine.maintenance.entity.ScheduleStatus;
import com.rigoomarine.maintenance.entity.ServiceScheduleItem;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.entity.Urgency;
import com.rigoomarine.maintenance.repository.ServiceHistoryRecordRepository;
import com.rigoomarine.maintenance.repository.ServiceScheduleItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.*;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ServiceScheduleServiceTest {

    private static final ZoneId QATAR = ZoneId.of("Asia/Qatar");
    private static final Clock FIXED = Clock.fixed(
        LocalDate.of(2026, 5, 14).atStartOfDay(QATAR).toInstant(), QATAR);

    private ServiceScheduleItemRepository scheduleRepo;
    private ServiceHistoryRecordRepository historyRepo;
    private ServiceScheduleService service;

    @BeforeEach
    void setUp() {
        scheduleRepo = mock(ServiceScheduleItemRepository.class);
        historyRepo = mock(ServiceHistoryRecordRepository.class);
        service = new ServiceScheduleService(scheduleRepo, historyRepo, FIXED);
        ReflectionTestUtils.setField(service, "lookAheadDays", 14);
        ReflectionTestUtils.setField(service, "hoursTolerance", 10);

        when(scheduleRepo.save(any(ServiceScheduleItem.class)))
            .thenAnswer(inv -> {
                ServiceScheduleItem s = inv.getArgument(0);
                if (s.getId() == null) s.setId(1L);
                return s;
            });
    }

    @Test
    void upsert_seedsNextDueFromIntervals() {
        when(scheduleRepo.findByVesselIdAndServiceType(42L, ServiceType.OIL_CHANGE))
            .thenReturn(Optional.empty());

        UpsertScheduleRequest req = UpsertScheduleRequest.builder()
            .intervalDays(180)
            .intervalHours(new BigDecimal("100.0"))
            .build();

        ServiceScheduleDTO dto = service.upsert(42L, 7L, ServiceType.OIL_CHANGE, req, new BigDecimal("220.0"));

        assertThat(dto.getNextDueDate()).isEqualTo(LocalDate.of(2026, 5, 14).plusDays(180));
        assertThat(dto.getNextDueHours()).isEqualByComparingTo("320.0");
        assertThat(dto.getStatus()).isEqualTo(ScheduleStatus.ACTIVE);
    }

    @Test
    void advanceAfterService_rollsNextDueForward() {
        ServiceScheduleItem item = ServiceScheduleItem.builder()
            .id(1L).vesselId(42L).clientId(7L)
            .serviceType(ServiceType.OIL_CHANGE)
            .intervalDays(180).intervalHours(new BigDecimal("100.0"))
            .nextDueDate(LocalDate.of(2026, 5, 1))
            .nextDueHours(new BigDecimal("250.0"))
            .status(ScheduleStatus.ACTIVE)
            .lastNotifiedAt(Instant.now(FIXED))
            .snoozedUntil(LocalDate.of(2026, 6, 1))
            .build();
        when(scheduleRepo.findByVesselIdAndServiceType(42L, ServiceType.OIL_CHANGE))
            .thenReturn(Optional.of(item));

        Optional<ServiceScheduleDTO> dto = service.advanceAfterService(
            42L, ServiceType.OIL_CHANGE, LocalDate.of(2026, 5, 14),
            new BigDecimal("245.0"), new BigDecimal("245.0"));

        assertThat(dto).isPresent();
        assertThat(dto.get().getNextDueDate()).isEqualTo(LocalDate.of(2026, 11, 10));
        assertThat(dto.get().getNextDueHours()).isEqualByComparingTo("345.0");
        // Re-arm: lastNotifiedAt + snoozedUntil cleared so reminders resume normally.
        assertThat(item.getLastNotifiedAt()).isNull();
        assertThat(item.getSnoozedUntil()).isNull();
    }

    @Test
    void classify_overdueWhenHoursPastThreshold() {
        Urgency u = service.classify(30, new BigDecimal("-5.0"));
        assertThat(u).isEqualTo(Urgency.OVERDUE);
    }

    @Test
    void classify_dueSoonByHoursEvenIfDateUpcoming() {
        Urgency u = service.classify(60, new BigDecimal("8.0"));
        assertThat(u).isEqualTo(Urgency.DUE_SOON);
    }

    @Test
    void classify_upcomingWhenBothHeadroomsLarge() {
        Urgency u = service.classify(60, new BigDecimal("80.0"));
        assertThat(u).isEqualTo(Urgency.UPCOMING);
    }
}
