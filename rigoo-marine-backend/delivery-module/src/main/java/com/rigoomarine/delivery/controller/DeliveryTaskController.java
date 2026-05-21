package com.rigoomarine.delivery.controller;

import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.delivery.dto.DeliveryTaskDTO;
import com.rigoomarine.delivery.dto.PositionUpdateRequest;
import com.rigoomarine.delivery.dto.UpdateStatusRequest;
import com.rigoomarine.delivery.entity.DeliveryTaskStatus;
import com.rigoomarine.delivery.repository.DeliveryTaskRepository;
import com.rigoomarine.delivery.service.DeliveryTaskService;
import com.rigoomarine.delivery.service.PositionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/delivery")
@RequiredArgsConstructor
public class DeliveryTaskController {

    private final DeliveryTaskService taskService;
    private final PositionService positionService;
    private final DeliveryTaskRepository taskRepository;

    @Value("${app.delivery.upload-dir:./uploads/delivery}")
    private String uploadDir;

    @GetMapping("/tasks/today")
    @PreAuthorize("hasAnyRole('DELIVERY')")
    public List<DeliveryTaskDTO> getTodayTasks() {
        Long techId = SecurityUtils.currentClientIdOrThrow();
        return taskService.getTodayTasksForTech(techId);
    }

    @GetMapping("/tasks/{id}")
    @PreAuthorize("hasAnyRole('DELIVERY')")
    public DeliveryTaskDTO getTask(@PathVariable Long id) {
        Long techId = SecurityUtils.currentClientIdOrThrow();
        return taskService.getTaskById(id, techId);
    }

    @PatchMapping("/tasks/{id}/status")
    @PreAuthorize("hasAnyRole('DELIVERY')")
    public DeliveryTaskDTO updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest req) {
        Long techId = SecurityUtils.currentClientIdOrThrow();
        return taskService.updateStatus(id, techId, req);
    }

    @PostMapping("/tasks/{id}/proof")
    @PreAuthorize("hasAnyRole('DELIVERY')")
    public DeliveryTaskDTO uploadProof(@PathVariable Long id,
                                       @RequestParam("file") MultipartFile file) throws IOException {
        Long techId = SecurityUtils.currentClientIdOrThrow();
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path dir = Paths.get(uploadDir, "proof");
        Files.createDirectories(dir);
        Files.copy(file.getInputStream(), dir.resolve(fileName));
        String filePath = "delivery/proof/" + fileName;
        return taskService.setProofPhoto(id, techId, filePath);
    }

    @PostMapping("/position")
    @PreAuthorize("hasAnyRole('DELIVERY')")
    public ResponseEntity<Void> updatePosition(@Valid @RequestBody PositionUpdateRequest req) {
        Long techId = SecurityUtils.currentClientIdOrThrow();
        positionService.updatePosition(techId, req);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/position/{techId}")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getPosition(@PathVariable Long techId) {
        Map<String, Object> pos = positionService.getPosition(techId);
        return pos != null ? ResponseEntity.ok(pos) : ResponseEntity.notFound().build();
    }

    @GetMapping("/positions")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'ADMIN')")
    public List<Map<String, Object>> getAllPositions() {
        List<Long> activeTechIds = taskRepository.findActiveTechIdsForDate(
                LocalDate.now(),
                List.of(DeliveryTaskStatus.DELIVERED, DeliveryTaskStatus.FAILED));
        return positionService.getAllPositions(activeTechIds);
    }
}
