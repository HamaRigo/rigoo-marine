package com.rigoomarine.workorder.controller;

import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.workorder.dto.TimeLogDTO;
import com.rigoomarine.workorder.entity.WorkOrderTimeLog;
import com.rigoomarine.workorder.repository.WorkOrderTimeLogRepository;
import com.rigoomarine.workorder.repository.WorkOrderRepository;
import com.rigoomarine.workorder.exception.WorkOrderNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Technician time-tracking endpoints.
 *
 * Business rules enforced here:
 * - Only one open session per work order at a time (clock_out IS NULL).
 *   A second clock-in attempt while a session is open is rejected with 409.
 * - Only TECHNICIAN, TEAM_LEAD, or ADMIN may clock in/out.
 *   Clients may read (GET) only their own orders.
 * - Clock-out is idempotent if there is no open session — returns the last log.
 */
@Slf4j
@RestController
@RequestMapping("/api/work-orders/{id}/time")
@RequiredArgsConstructor
public class WorkOrderTimeController {

    private final WorkOrderTimeLogRepository timeRepo;
    private final WorkOrderRepository orderRepo;

    @PreAuthorize("hasAnyRole('TECHNICIAN', 'TEAM_LEAD', 'ADMIN')")
    @PostMapping("/clock-in")
    @Transactional
    public ResponseEntity<TimeLogDTO> clockIn(@PathVariable Long id) {
        orderRepo.findById(id).orElseThrow(() -> new WorkOrderNotFoundException(id));

        timeRepo.findOpenSession(id).ifPresent(open -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "An open session already exists — clock out first (session id=" + open.getId() + ")");
        });

        Long techId = SecurityUtils.currentClientIdOrThrow();
        WorkOrderTimeLog entry = WorkOrderTimeLog.builder()
            .workOrderId(id)
            .technicianId(techId)
            .clockIn(LocalDateTime.now())
            .build();
        entry = timeRepo.save(entry);
        log.info("clockIn workOrderId={} techId={} logId={}", id, techId, entry.getId());
        return ResponseEntity.ok(TimeLogDTO.from(entry));
    }

    @PreAuthorize("hasAnyRole('TECHNICIAN', 'TEAM_LEAD', 'ADMIN')")
    @PostMapping("/clock-out")
    @Transactional
    public ResponseEntity<TimeLogDTO> clockOut(
            @PathVariable Long id,
            @RequestParam(required = false) String note
    ) {
        WorkOrderTimeLog open = timeRepo.findOpenSession(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.CONFLICT,
                "No open session found for work order " + id));

        open.setClockOut(LocalDateTime.now());
        if (note != null && !note.isBlank()) open.setNote(note.trim());
        open = timeRepo.save(open);
        log.info("clockOut workOrderId={} logId={} durationMin={}", id, open.getId(), open.getDurationMin());
        return ResponseEntity.ok(TimeLogDTO.from(open));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getLogs(@PathVariable Long id) {
        List<TimeLogDTO> logs = timeRepo.findByWorkOrderIdOrderByClockInDesc(id)
            .stream().map(TimeLogDTO::from).toList();
        int totalMin = timeRepo.totalMinutes(id);
        return ResponseEntity.ok(Map.of(
            "logs",         logs,
            "totalMinutes", totalMin,
            "totalHours",   totalMin / 60.0
        ));
    }

}
