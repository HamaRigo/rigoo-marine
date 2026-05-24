package com.rigoomarine.delivery.service;

import com.rigoomarine.delivery.dto.AssignTaskRequest;
import com.rigoomarine.delivery.dto.CreateDeliveryTaskRequest;
import com.rigoomarine.delivery.dto.DeliveryStatsDTO;
import com.rigoomarine.delivery.dto.DeliveryTaskDTO;
import com.rigoomarine.delivery.dto.UpdateStatusRequest;
import com.rigoomarine.delivery.entity.DeliverySettings;
import com.rigoomarine.delivery.entity.DeliveryTask;
import com.rigoomarine.delivery.entity.DeliveryTaskStatus;
import com.rigoomarine.delivery.event.DeliveryEventPublisher;
import com.rigoomarine.delivery.event.DeliveryStatusChangeEvent;
import com.rigoomarine.delivery.repository.DeliverySettingsRepository;
import com.rigoomarine.delivery.repository.DeliveryTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeliveryTaskService {

    private final DeliveryTaskRepository repo;
    private final DeliverySettingsRepository settingsRepo;
    private final DeliveryEventPublisher eventPublisher;

    public List<DeliveryTaskDTO> getTodayTasksForTech(Long techId, LocalDate date) {
        return repo.findByAssignedToAndScheduledDateOrderByStopOrderAscIdAsc(techId, date)
                .stream().map(DeliveryTaskDTO::new).toList();
    }

    public DeliveryTaskDTO getTaskById(Long id, Long techId) {
        DeliveryTask task = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (techId != null && !techId.equals(task.getAssignedTo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your task");
        }
        return new DeliveryTaskDTO(task);
    }

    @Transactional
    public DeliveryTaskDTO updateStatus(Long id, Long techId, UpdateStatusRequest req) {
        DeliveryTask task = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (!techId.equals(task.getAssignedTo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your task");
        }

        DeliveryTaskStatus next = req.getStatus();
        validateTransition(task.getStatus(), next);

        task.setStatus(next);
        if (next == DeliveryTaskStatus.DELIVERED) {
            task.setDeliveredAt(LocalDateTime.now());
        }
        if (next == DeliveryTaskStatus.FAILED) {
            task.setFailedReason(req.getFailedReason());
        }
        DeliveryTask saved = repo.save(task);

        if (next == DeliveryTaskStatus.DELIVERED || next == DeliveryTaskStatus.FAILED) {
            eventPublisher.publishAfterCommit(DeliveryStatusChangeEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .occurredAt(Instant.now())
                    .taskId(saved.getId())
                    .status(next)
                    .deliveryAddress(saved.getDeliveryAddress())
                    .failedReason(saved.getFailedReason())
                    .build());
        }
        return new DeliveryTaskDTO(saved);
    }

    @Transactional
    public DeliveryTaskDTO setProofPhoto(Long id, Long techId, String filePath) {
        DeliveryTask task = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (!techId.equals(task.getAssignedTo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your task");
        }
        task.setProofPhotoPath(filePath);
        return new DeliveryTaskDTO(repo.save(task));
    }

    public List<DeliveryTaskDTO> getTasksForTechInRange(Long techId, LocalDate from, LocalDate to) {
        return repo.findByAssignedToAndScheduledDateBetweenOrderByScheduledDateDescStopOrderAscIdAsc(techId, from, to)
                .stream().map(DeliveryTaskDTO::new).toList();
    }

    public List<DeliveryTaskDTO> getAllDriverHistoryInRange(LocalDate from, LocalDate to) {
        return repo.findByAssignedToNotNullAndScheduledDateBetweenOrderByAssignedToAscScheduledDateDescIdAsc(from, to)
                .stream().map(DeliveryTaskDTO::new).toList();
    }

    public DeliveryStatsDTO getStatsForTech(Long techId) {
        List<Object[]> rows = repo.countByStatusGroupedForTech(techId);
        long delivered = 0, failed = 0, inTransit = 0, pending = 0, cancelled = 0;
        for (Object[] row : rows) {
            DeliveryTaskStatus status = (DeliveryTaskStatus) row[0];
            long count = (Long) row[1];
            switch (status) {
                case DELIVERED  -> delivered  = count;
                case FAILED     -> failed     = count;
                case IN_TRANSIT -> inTransit  = count;
                case PENDING, ASSIGNED, PICKED_UP -> pending += count;
                case CANCELLED  -> cancelled  = count;
            }
        }
        long total = repo.countByAssignedTo(techId);
        return new DeliveryStatsDTO(total, delivered, failed, inTransit, pending, cancelled);
    }

    public DeliverySettings getSettings() {
        return settingsRepo.findById(1L).orElseGet(() -> {
            DeliverySettings s = new DeliverySettings();
            return settingsRepo.save(s);
        });
    }

    @Transactional
    public DeliverySettings updateHistoryDays(int days) {
        DeliverySettings s = getSettings();
        s.setHistoryDays(Math.max(1, Math.min(365, days)));
        return settingsRepo.save(s);
    }

    // --- Admin / Team Lead ---

    public Page<DeliveryTaskDTO> adminSearch(LocalDate date, Long assignedTo, DeliveryTaskStatus status, Pageable pageable) {
        if (date != null && assignedTo != null && status != null) {
            return repo.findByScheduledDateAndAssignedToAndStatus(date, assignedTo, status, pageable).map(DeliveryTaskDTO::new);
        }
        if (date != null && assignedTo != null) {
            return repo.findByScheduledDateAndAssignedTo(date, assignedTo, pageable).map(DeliveryTaskDTO::new);
        }
        if (date != null && status != null) {
            return repo.findByScheduledDateAndStatus(date, status, pageable).map(DeliveryTaskDTO::new);
        }
        if (date != null) {
            return repo.findByScheduledDate(date, pageable).map(DeliveryTaskDTO::new);
        }
        if (status != null) {
            return repo.findByStatus(status, pageable).map(DeliveryTaskDTO::new);
        }
        return repo.findAll(pageable).map(DeliveryTaskDTO::new);
    }

    @Transactional
    public DeliveryTaskDTO create(CreateDeliveryTaskRequest req) {
        DeliveryTask task = new DeliveryTask();
        task.setType(req.getType());
        task.setReferenceId(req.getReferenceId() != null ? req.getReferenceId() : 0L);
        task.setDeliveryAddress(req.getDeliveryAddress());
        task.setScheduledDate(req.getScheduledDate());
        task.setPickupLabel(req.getPickupLabel());
        task.setPickupAddress(req.getPickupAddress());
        task.setPickupLat(req.getPickupLat());
        task.setPickupLng(req.getPickupLng());
        task.setDeliveryLat(req.getDeliveryLat());
        task.setDeliveryLng(req.getDeliveryLng());
        task.setClientPhone(req.getClientPhone());
        task.setInvoiceId(req.getInvoiceId());
        task.setInvoiceAmount(req.getInvoiceAmount());
        task.setStopOrder(req.getStopOrder());
        task.setNotes(req.getNotes());
        return new DeliveryTaskDTO(repo.save(task));
    }

    @Transactional
    public DeliveryTaskDTO assign(Long id, AssignTaskRequest req) {
        DeliveryTask task = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        task.setAssignedTo(req.getTechnicianId());
        if (task.getStatus() == DeliveryTaskStatus.PENDING) {
            task.setStatus(DeliveryTaskStatus.ASSIGNED);
        }
        return new DeliveryTaskDTO(repo.save(task));
    }

    public DeliveryTaskDTO adminGetById(Long id) {
        return repo.findById(id)
                .map(DeliveryTaskDTO::new)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }

    @Transactional
    public DeliveryTaskDTO cancelTask(Long id, String reason) {
        DeliveryTask task = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (task.getStatus() == DeliveryTaskStatus.DELIVERED || task.getStatus() == DeliveryTaskStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot cancel a task that is already " + task.getStatus());
        }
        task.setStatus(DeliveryTaskStatus.CANCELLED);
        if (reason != null && !reason.isBlank()) {
            task.setFailedReason(reason);
        }
        return new DeliveryTaskDTO(repo.save(task));
    }

    @Transactional
    public DeliveryTaskDTO adminForceStatus(Long id, DeliveryTaskStatus newStatus) {
        DeliveryTask task = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        task.setStatus(newStatus);
        if (newStatus == DeliveryTaskStatus.DELIVERED) {
            task.setDeliveredAt(LocalDateTime.now());
        }
        return new DeliveryTaskDTO(repo.save(task));
    }

    private void validateTransition(DeliveryTaskStatus current, DeliveryTaskStatus next) {
        boolean valid = switch (current) {
            case ASSIGNED  -> next == DeliveryTaskStatus.PICKED_UP;
            case PICKED_UP -> next == DeliveryTaskStatus.IN_TRANSIT;
            case IN_TRANSIT -> next == DeliveryTaskStatus.DELIVERED || next == DeliveryTaskStatus.FAILED;
            default -> false;
        };
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid transition: " + current + " → " + next);
        }
    }
}
