package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.entity.ScheduleStatus;
import com.rigoomarine.maintenance.entity.ServiceScheduleItem;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.entity.Urgency;
import com.rigoomarine.maintenance.repository.ServiceScheduleItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ServiceDueDetectorTest {

    private static final ZoneId QATAR = ZoneId.of("Asia/Qatar");
    private static final Clock FIXED = Clock.fixed(
        LocalDate.of(2026, 5, 14).atStartOfDay(QATAR).toInstant(), QATAR);

    private ServiceScheduleItemRepository scheduleRepo;
    private VesselClient vesselClient;
    private ServiceDueDetector detector;

    @BeforeEach
    void setUp() {
        scheduleRepo = mock(ServiceScheduleItemRepository.class);
        vesselClient = mock(VesselClient.class);
        detector = new ServiceDueDetector(scheduleRepo, vesselClient, FIXED);
        ReflectionTestUtils.setField(detector, "lookAheadDays", 14);
        ReflectionTestUtils.setField(detector, "hoursTolerance", 10);
        ReflectionTestUtils.setField(detector, "renotifyCooldownDays", 7);
    }

    @Test
    void classifiesOverdueByDate() {
        ServiceScheduleItem item = baseItem();
        item.setNextDueDate(LocalDate.of(2026, 5, 10)); // 4 days ago

        when(scheduleRepo.findSweepCandidates(any(), any(), any())).thenReturn(List.of(item));
        when(vesselClient.getEngineHours(anyLong())).thenReturn(null);

        List<ServiceDueDetector.DueItem> due = detector.sweep();

        assertThat(due).hasSize(1);
        assertThat(due.get(0).urgency()).isEqualTo(Urgency.OVERDUE);
        assertThat(due.get(0).daysUntilDue()).isEqualTo(-4);
    }

    @Test
    void classifiesDueSoonByDate() {
        ServiceScheduleItem item = baseItem();
        item.setNextDueDate(LocalDate.of(2026, 5, 20)); // 6 days ahead

        when(scheduleRepo.findSweepCandidates(any(), any(), any())).thenReturn(List.of(item));
        when(vesselClient.getEngineHours(anyLong())).thenReturn(null);

        List<ServiceDueDetector.DueItem> due = detector.sweep();

        assertThat(due).hasSize(1);
        assertThat(due.get(0).urgency()).isEqualTo(Urgency.DUE_SOON);
    }

    @Test
    void classifiesOverdueByEngineHours() {
        ServiceScheduleItem item = baseItem();
        item.setNextDueHours(new BigDecimal("250.0")); // vessel will be at 260h
        item.setNextDueDate(LocalDate.of(2027, 1, 1)); // far in the future

        when(scheduleRepo.findSweepCandidates(any(), any(), any())).thenReturn(List.of(item));
        Map<String, Object> reading = new HashMap<>();
        reading.put("hours", new BigDecimal("260.0"));
        when(vesselClient.getEngineHours(anyLong())).thenReturn(reading);

        List<ServiceDueDetector.DueItem> due = detector.sweep();

        assertThat(due).hasSize(1);
        assertThat(due.get(0).urgency()).isEqualTo(Urgency.OVERDUE);
        assertThat(due.get(0).hoursUntilDue()).isEqualByComparingTo("-10.0");
    }

    @Test
    void upcomingFarFutureIsExcluded() {
        ServiceScheduleItem item = baseItem();
        item.setNextDueDate(LocalDate.of(2026, 12, 31)); // months away

        when(scheduleRepo.findSweepCandidates(any(), any(), any())).thenReturn(List.of(item));
        when(vesselClient.getEngineHours(anyLong())).thenReturn(null);

        // Note: in practice the SQL pre-filter already excludes far-future
        // calendar items unless they have a hours threshold. The detector
        // still re-classifies and drops UPCOMING regardless.
        List<ServiceDueDetector.DueItem> due = detector.sweep();
        assertThat(due).isEmpty();
    }

    private ServiceScheduleItem baseItem() {
        return ServiceScheduleItem.builder()
            .id(1L)
            .vesselId(42L)
            .clientId(7L)
            .serviceType(ServiceType.OIL_CHANGE)
            .intervalDays(180)
            .intervalHours(new BigDecimal("100.0"))
            .status(ScheduleStatus.ACTIVE)
            .build();
    }
}
