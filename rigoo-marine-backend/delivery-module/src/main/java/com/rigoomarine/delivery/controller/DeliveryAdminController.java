package com.rigoomarine.delivery.controller;

import com.rigoomarine.delivery.dto.AssignTaskRequest;
import com.rigoomarine.delivery.dto.CreateDeliveryTaskRequest;
import com.rigoomarine.delivery.dto.DeliveryTaskDTO;
import com.rigoomarine.delivery.dto.UpdateStatusRequest;
import com.rigoomarine.delivery.entity.DeliverySettings;
import com.rigoomarine.delivery.entity.DeliveryTaskStatus;
import com.rigoomarine.delivery.service.DeliveryTaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/delivery/admin")
@RequiredArgsConstructor
public class DeliveryAdminController {

    private final DeliveryTaskService taskService;

    @GetMapping("/tasks")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'ADMIN')")
    public Page<DeliveryTaskDTO> listTasks(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long assignedTo,
            @RequestParam(required = false) DeliveryTaskStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return taskService.adminSearch(date, assignedTo, status,
                PageRequest.of(page, size, Sort.by("scheduledDate").descending().and(Sort.by("stopOrder").ascending())));
    }

    @GetMapping("/tasks/{id}")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'ADMIN')")
    public DeliveryTaskDTO getTask(@PathVariable Long id) {
        return taskService.adminGetById(id);
    }

    @PostMapping("/tasks")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public DeliveryTaskDTO create(@Valid @RequestBody CreateDeliveryTaskRequest req) {
        return taskService.create(req);
    }

    @PatchMapping("/tasks/{id}/assign")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'ADMIN')")
    public DeliveryTaskDTO assign(@PathVariable Long id, @Valid @RequestBody AssignTaskRequest req) {
        return taskService.assign(id, req);
    }

    @PatchMapping("/tasks/{id}/cancel")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'ADMIN')")
    public DeliveryTaskDTO cancel(@PathVariable Long id,
                                  @RequestParam(required = false) String reason) {
        return taskService.cancelTask(id, reason);
    }

    @PatchMapping("/tasks/{id}/status")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'ADMIN')")
    public DeliveryTaskDTO forceStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest req) {
        return taskService.adminForceStatus(id, req.getStatus());
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'ADMIN')")
    public List<DeliveryTaskDTO> getDriverHistory(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return taskService.getAllDriverHistoryInRange(from, to);
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'ADMIN')")
    public DeliverySettings updateSettings(@RequestParam int historyDays) {
        return taskService.updateHistoryDays(historyDays);
    }
}
