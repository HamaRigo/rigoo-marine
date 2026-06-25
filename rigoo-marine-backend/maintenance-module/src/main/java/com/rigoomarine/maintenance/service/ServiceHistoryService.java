package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.client.VesselClient;
import com.rigoomarine.maintenance.dto.AddAttachmentRequest;
import com.rigoomarine.maintenance.dto.CreateServiceHistoryRequest;
import com.rigoomarine.maintenance.dto.ServiceHistoryAttachmentDTO;
import com.rigoomarine.maintenance.dto.ServiceHistoryDTO;
import com.rigoomarine.maintenance.entity.ServiceHistoryAttachment;
import com.rigoomarine.maintenance.entity.ServiceHistoryRecord;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.exception.AttachmentLimitReachedException;
import com.rigoomarine.maintenance.exception.InvalidEngineHoursException;
import com.rigoomarine.maintenance.exception.ServiceHistoryNotFoundException;
import com.rigoomarine.maintenance.exception.UnsupportedAttachmentTypeException;
import com.rigoomarine.maintenance.exception.VesselLookupUnavailableException;
import com.rigoomarine.maintenance.repository.ServiceHistoryAttachmentRepository;
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
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

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

    /**
     * Per-history attachment cap. Trade-off: low enough to discourage abuse
     * (no client should need 50 receipt photos on one oil change), high
     * enough to handle the legitimate "before + after + 3 part photos +
     * receipt + warranty card" case.
     */
    private static final int MAX_ATTACHMENTS_PER_HISTORY = 10;

    private static final Set<String> ALLOWED_ATTACHMENT_CONTENT_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic",
        "application/pdf"
    );

    private final ServiceHistoryRecordRepository historyRepo;
    private final ServiceHistoryAttachmentRepository attachmentRepo;
    private final ServiceScheduleService scheduleService;
    private final DossierCacheService dossierCache;
    private final VesselClient vesselClient;
    private final Clock clock;
    private final MaintenanceAuditLogger auditLogger;

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

        dossierCache.evict(vesselId);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public Page<ServiceHistoryDTO> search(Long vesselId, ServiceType type,
                                          LocalDate from, LocalDate to, Pageable pageable) {
        Page<ServiceHistoryRecord> page = type == null
            ? historyRepo.searchAll(vesselId, from, to, pageable)
            : historyRepo.search(vesselId, type, from, to, pageable);
        return page.map(this::toDTO);
    }

    public void delete(Long id, Long callerClientId, boolean isAdminOrTechnician) {
        ServiceHistoryRecord record = historyRepo.findById(id)
            .orElseThrow(() -> new ServiceHistoryNotFoundException(id));
        if (!isAdminOrTechnician && !record.getClientId().equals(callerClientId)) {
            throw new ServiceHistoryNotFoundException(id);
        }
        Long vesselId = record.getVesselId();
        historyRepo.delete(record);
        auditLogger.recordIfAdminActingOnBehalf(
            "MAINTENANCE_HISTORY_DELETE", "VESSEL", vesselId, record.getClientId(),
            "{\"historyId\":" + id + ",\"type\":\"" + record.getServiceType() + "\"}");
        scheduleService.recomputeFromHistory(vesselId, record.getServiceType());
        dossierCache.evict(vesselId);
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

    // ─── Attachments ─────────────────────────────────────────────────────────

    /**
     * Attach a file pointer to a history record. The bytes themselves
     * have already been uploaded via client-module's media pipeline; we
     * just persist the URL + metadata + the linkage.
     *
     * <p>Ownership: a non-owner client gets the same 404-collapse the
     * regular history endpoints use — we don't leak whether the history
     * id exists.
     */
    public ServiceHistoryAttachmentDTO addAttachment(Long historyId, Long callerClientId,
                                                     boolean isAdminOrTechnician,
                                                     AddAttachmentRequest req) {
        ServiceHistoryRecord record = historyRepo.findById(historyId)
            .orElseThrow(() -> new ServiceHistoryNotFoundException(historyId));
        if (!isAdminOrTechnician && !record.getClientId().equals(callerClientId)) {
            throw new ServiceHistoryNotFoundException(historyId);
        }

        if (!ALLOWED_ATTACHMENT_CONTENT_TYPES.contains(req.getContentType().toLowerCase())) {
            throw new UnsupportedAttachmentTypeException(req.getContentType());
        }

        long existing = attachmentRepo.countByServiceHistoryId(historyId);
        if (existing >= MAX_ATTACHMENTS_PER_HISTORY) {
            throw new AttachmentLimitReachedException(historyId, MAX_ATTACHMENTS_PER_HISTORY);
        }

        ServiceHistoryAttachment a = ServiceHistoryAttachment.builder()
            .serviceHistoryId(historyId)
            .clientId(record.getClientId())
            .url(req.getUrl())
            .filename(req.getFilename())
            .contentType(req.getContentType())
            .sizeBytes(req.getSizeBytes())
            .build();
        return ServiceHistoryAttachmentDTO.from(attachmentRepo.save(a));
    }

    @Transactional(readOnly = true)
    public List<ServiceHistoryAttachmentDTO> listAttachments(Long historyId, Long callerClientId,
                                                              boolean isAdminOrTechnician) {
        ServiceHistoryRecord record = historyRepo.findById(historyId)
            .orElseThrow(() -> new ServiceHistoryNotFoundException(historyId));
        if (!isAdminOrTechnician && !record.getClientId().equals(callerClientId)) {
            throw new ServiceHistoryNotFoundException(historyId);
        }
        return attachmentRepo.findByServiceHistoryId(historyId).stream()
            .map(ServiceHistoryAttachmentDTO::from)
            .toList();
    }

    /**
     * Batch fetch for the dossier read. Returns attachments grouped by
     * service-history-id; missing ids map to empty lists at the call site.
     * Single query for any number of history rows — no N+1.
     */
    @Transactional(readOnly = true)
    public java.util.Map<Long, List<ServiceHistoryAttachmentDTO>> attachmentsByHistoryIds(
            Collection<Long> historyIds) {
        if (historyIds == null || historyIds.isEmpty()) return java.util.Map.of();
        java.util.Map<Long, List<ServiceHistoryAttachmentDTO>> grouped = new java.util.HashMap<>();
        for (var a : attachmentRepo.findByServiceHistoryIdIn(historyIds)) {
            grouped.computeIfAbsent(a.getServiceHistoryId(), k -> new java.util.ArrayList<>())
                .add(ServiceHistoryAttachmentDTO.from(a));
        }
        return grouped;
    }

    public void deleteAttachment(Long attachmentId, Long callerClientId, boolean isAdminOrTechnician) {
        ServiceHistoryAttachment a = attachmentRepo.findById(attachmentId)
            .orElseThrow(() -> new ServiceHistoryNotFoundException(attachmentId));
        if (!isAdminOrTechnician && !a.getClientId().equals(callerClientId)) {
            // 404-collapse, same as the history record path.
            throw new ServiceHistoryNotFoundException(attachmentId);
        }
        attachmentRepo.delete(a);
        // File-side cleanup is deliberately not handled here. The bytes
        // remain in client-module storage; a future orphan-cleanup job
        // would walk media rows with no inbound references and prune
        // them. Tracked separately.
    }
}
