package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.entity.ServiceHistoryRecord;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.exception.VesselLookupUnavailableException;
import com.rigoomarine.maintenance.repository.ServiceHistoryRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Orchestrates the auto-creation of service-history rows when a work-order
 * completes. Called from the Kafka consumer; idempotent at three layers
 * (repository pre-check → DB unique index → DataIntegrityViolation catch).
 *
 * <p>The handler intentionally writes a sparse history row: cost is left null
 * (the invoice flow may not have run yet), notes carry the WO link, and
 * engineHoursAtService snapshots vessel-service's current reading at the time
 * the event is processed.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class WorkOrderCompletionHandler {

    private final ServiceHistoryRecordRepository historyRepo;
    private final ServiceScheduleService scheduleService;
    private final ServiceTypeClassifier classifier;
    private final VesselClient vesselClient;

    public void handle(WorkOrderCompletionEvent event) {
        if (event.vesselId == null || event.clientId == null) {
            log.warn("Skipping WO {} — missing vesselId/clientId", event.workOrderId);
            return;
        }

        Set<ServiceType> types = classifier.classify(event.serviceNames, event.issueCategory);
        BigDecimal currentHours = readEngineHoursTolerant(event.vesselId);

        LocalDate performedOn = event.completedAt == null
            ? LocalDate.now()
            : event.completedAt.toLocalDate();

        for (ServiceType type : types) {
            if (historyRepo.existsByWorkOrderIdAndServiceType(event.workOrderId, type)) {
                log.debug("WO {} already has history for {}, skipping", event.workOrderId, type);
                continue;
            }
            ServiceHistoryRecord record = ServiceHistoryRecord.builder()
                .vesselId(event.vesselId)
                .clientId(event.clientId)
                .serviceType(type)
                .performedOn(performedOn)
                .engineHoursAtService(currentHours)
                .currency("QAR")
                .technicianId(event.technicianId)
                .workOrderId(event.workOrderId)
                .performedBy(deriveTechName(event))
                .notes(deriveNotes(event, type))
                .build();
            try {
                historyRepo.save(record);
            } catch (DataIntegrityViolationException race) {
                // A concurrent redelivery on another partition won the insert.
                // The row that won is correct — log and move on.
                log.info("Concurrent insert for WO {} type {} — keeping the winner",
                    event.workOrderId, type);
                continue;
            }
            scheduleService.advanceAfterService(
                event.vesselId, type, performedOn, currentHours, currentHours);
        }
    }

    private BigDecimal readEngineHoursTolerant(Long vesselId) {
        try {
            Map<String, Object> resp = vesselClient.getEngineHours(vesselId);
            if (resp == null) return null;
            Object hours = resp.get("hours");
            return hours == null ? null : new BigDecimal(hours.toString());
        } catch (VesselLookupUnavailableException ex) {
            log.warn("engineHours unavailable for auto-history vessel={}: {}",
                vesselId, ex.getMessage());
            return null;
        }
    }

    private String deriveTechName(WorkOrderCompletionEvent event) {
        if (event.technicianId == null) return "Auto-logged from work order";
        return "Technician #" + event.technicianId;
    }

    private String deriveNotes(WorkOrderCompletionEvent event, ServiceType type) {
        StringBuilder sb = new StringBuilder();
        sb.append("Auto from work order #").append(event.workOrderId);
        if (event.serviceNames != null && !event.serviceNames.isEmpty()) {
            sb.append(" — ").append(String.join(", ", event.serviceNames));
        }
        if (event.notes != null && !event.notes.isBlank()) {
            sb.append('\n').append(event.notes);
        }
        return sb.toString().substring(0, Math.min(sb.length(), 2000));
    }

    /**
     * Internal value carrier — the public-facing event type lives in
     * work-order-module and would force a class-path dependency. The Kafka
     * consumer adapts the deserialised Map to this record.
     */
    public record WorkOrderCompletionEvent(
        Long workOrderId,
        Long clientId,
        Long vesselId,
        Long technicianId,
        LocalDateTime completedAt,
        Set<Long> serviceIds,
        List<String> serviceNames,
        String issueCategory,
        String notes
    ) {
        public WorkOrderCompletionEvent {
            Objects.requireNonNull(workOrderId, "workOrderId");
        }
    }
}
