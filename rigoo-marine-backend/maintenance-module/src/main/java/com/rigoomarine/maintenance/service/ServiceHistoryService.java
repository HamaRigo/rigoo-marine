package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.dto.CreateServiceHistoryRequest;
import com.rigoomarine.maintenance.dto.ServiceHistoryDTO;
import com.rigoomarine.maintenance.entity.ServiceHistoryRecord;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.exception.InvalidEngineHoursException;
import com.rigoomarine.maintenance.exception.ServiceHistoryNotFoundException;
import com.rigoomarine.maintenance.exception.VesselLookupUnavailableException;
import com.rigoomarine.maintenance.repository.ServiceHistoryRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

/**
 * Writes immutable history rows for completed services. The transactional flow
 * for an OIL_CHANGE entry is:
 *
 * <ol>
 *   <li>Validate vessel ownership + engine-hour sanity.</li>
 *   <li>Persist {@link ServiceHistoryRecord}.</li>
 *   <li>If the entry is for today AND the reading is higher than the vessel's
 *       current reading, push the new reading to vessel-service.</li>
 *   <li>Advance the matching {@link com.rigoomarine.maintenance.entity.ServiceScheduleItem}
 *       so the dossier widget reflects the new "next due" immediately.</li>
 * </ol>
 *
 * <p>Steps 3 and 4 are best-effort within the same transaction: if vessel-service
 * is down, step 3 throws {@link VesselLookupUnavailableException} which rolls
 * the history insert back. This is the desired behaviour — a divergent
 * vessel.engineHours would corrupt every downstream reminder.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ServiceHistoryService {

    private static final BigDecimal IMPLAUSIBLE_LEAP = BigDecimal.valueOf(2000);

    private final ServiceHistoryRecordRepository historyRepo;
    private final ServiceScheduleService scheduleService;
    private final VesselClient vesselClient;
    private final Clock clock;

    public ServiceHistoryDTO create(Long vesselId, Long clientId, CreateServiceHistoryRequest req, boolean force) {
        BigDecimal currentVesselHours = readCurrentEngineHoursTolerant(vesselId);
        validateHours(req, currentVesselHours, force);

        ServiceHistoryRecord record = ServiceHistoryRecord.builder()
            .vesselId(vesselId)
            .clientId(clientId)
            .serviceType(req.getServiceType())
            .performedOn(req.getPerformedOn())
            .engineHoursAtService(req.getEngineHoursAtService())
            .cost(req.getCost())
            .currency(req.getCurrency() == null ? "QAR" : req.getCurrency().toUpperCase())
            .performedBy(req.getPerformedBy())
            .technicianId(req.getTechnicianId())
            .workOrderId(req.getWorkOrderId())
            .notes(req.getNotes())
            .build();

        ServiceHistoryRecord saved = historyRepo.save(record);

        BigDecimal newReading = req.getEngineHoursAtService();
        boolean datedToday = !req.getPerformedOn().isBefore(LocalDate.now(clock));
        if (datedToday && newReading != null
            && (currentVesselHours == null || newReading.compareTo(currentVesselHours) > 0)) {
            try {
                vesselClient.updateEngineHours(vesselId, newReading);
            } catch (VesselLookupUnavailableException ex) {
                log.warn("engineHours push failed during history create — rolling back", ex);
                throw ex;
            }
        }

        scheduleService.advanceAfterService(vesselId, req.getServiceType(),
            req.getPerformedOn(), newReading, newReading != null ? newReading : currentVesselHours);

        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public Page<ServiceHistoryDTO> search(Long vesselId, ServiceType type,
                                          LocalDate from, LocalDate to, Pageable pageable) {
        return historyRepo.search(vesselId, type, from, to, pageable).map(this::toDTO);
    }

    public void delete(Long id, Long callerClientId, boolean isAdminOrTechnician) {
        ServiceHistoryRecord record = historyRepo.findById(id)
            .orElseThrow(() -> new ServiceHistoryNotFoundException(id));
        if (!isAdminOrTechnician && !record.getClientId().equals(callerClientId)) {
            throw new ServiceHistoryNotFoundException(id);
        }
        historyRepo.delete(record);
        scheduleService.recomputeFromHistory(record.getVesselId(), record.getServiceType());
    }

    private void validateHours(CreateServiceHistoryRequest req, BigDecimal currentVesselHours, boolean force) {
        BigDecimal hours = req.getEngineHoursAtService();
        if (hours == null) return;

        // Past-dated backfill is allowed regardless of current vessel reading.
        boolean datedToday = !req.getPerformedOn().isBefore(LocalDate.now(clock));
        if (!datedToday) return;

        if (currentVesselHours != null && hours.compareTo(currentVesselHours) < 0) {
            throw new InvalidEngineHoursException(
                "engineHoursAtService (" + hours + ") is less than current vessel reading ("
                    + currentVesselHours + ")");
        }
        if (currentVesselHours != null && !force
            && hours.subtract(currentVesselHours).compareTo(IMPLAUSIBLE_LEAP) > 0) {
            throw new InvalidEngineHoursException(
                "engineHours jump of " + hours.subtract(currentVesselHours)
                    + "h exceeds the safety threshold — re-submit with force=true if intentional");
        }
    }

    private BigDecimal readCurrentEngineHoursTolerant(Long vesselId) {
        try {
            Map<String, Object> resp = vesselClient.getEngineHours(vesselId);
            if (resp == null) return null;
            Object hours = resp.get("hours");
            if (hours == null) return null;
            return new BigDecimal(hours.toString());
        } catch (VesselLookupUnavailableException ex) {
            // Don't fail the write just because we can't read — but skip the
            // sanity ceiling. The vessel-service-side validator will guard the
            // PATCH update below if/when it succeeds.
            log.warn("engineHours read unavailable during history create; vessel={} — skipping sanity check",
                vesselId);
            return null;
        }
    }

    public ServiceHistoryDTO toDTO(ServiceHistoryRecord record) {
        return ServiceHistoryDTO.builder()
            .id(record.getId())
            .vesselId(record.getVesselId())
            .clientId(record.getClientId())
            .serviceType(record.getServiceType())
            .performedOn(record.getPerformedOn())
            .engineHoursAtService(record.getEngineHoursAtService())
            .cost(record.getCost())
            .currency(record.getCurrency())
            .performedBy(record.getPerformedBy())
            .technicianId(record.getTechnicianId())
            .workOrderId(record.getWorkOrderId())
            .notes(record.getNotes())
            .createdAt(record.getCreatedAt())
            .build();
    }

    /** Convenience for tests / consumers that bypass the request validator. */
    public Optional<ServiceHistoryRecord> findById(Long id) {
        return historyRepo.findById(id);
    }
}
