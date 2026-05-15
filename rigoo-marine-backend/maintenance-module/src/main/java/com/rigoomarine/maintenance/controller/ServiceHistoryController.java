package com.rigoomarine.maintenance.controller;

import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.maintenance.dto.AddAttachmentRequest;
import com.rigoomarine.maintenance.dto.CreateServiceHistoryRequest;
import com.rigoomarine.maintenance.dto.ServiceHistoryAttachmentDTO;
import com.rigoomarine.maintenance.dto.ServiceHistoryDTO;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.service.MaintenanceSecurity;
import com.rigoomarine.maintenance.service.ServiceHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/maintenance")
@RequiredArgsConstructor
public class ServiceHistoryController {

    private final ServiceHistoryService historyService;
    private final MaintenanceSecurity security;

    @GetMapping("/vessels/{vesselId}/history")
    public ResponseEntity<Page<ServiceHistoryDTO>> list(
            @PathVariable Long vesselId,
            @RequestParam(required = false) ServiceType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Pageable pageable
    ) {
        security.assertCanActOnVessel(vesselId);
        return ResponseEntity.ok(historyService.search(vesselId, type, from, to, pageable));
    }

    @PostMapping("/vessels/{vesselId}/history")
    public ResponseEntity<ServiceHistoryDTO> create(
            @PathVariable Long vesselId,
            @Valid @RequestBody CreateServiceHistoryRequest request,
            @RequestParam(defaultValue = "false") boolean force
    ) {
        Long clientId = security.assertCanActOnVessel(vesselId);
        ServiceHistoryDTO created = historyService.create(vesselId, clientId, request, force);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long clientId = currentClientIdOrNull();
        historyService.delete(id, clientId, security.isAdminOrTechnician());
        return ResponseEntity.noContent().build();
    }

    // ─── Attachments ─────────────────────────────────────────────────────────

    @PostMapping("/history/{id}/attachments")
    public ResponseEntity<ServiceHistoryAttachmentDTO> addAttachment(
            @PathVariable Long id,
            @Valid @RequestBody AddAttachmentRequest request
    ) {
        Long clientId = currentClientIdOrNull();
        ServiceHistoryAttachmentDTO dto = historyService.addAttachment(
            id, clientId, security.isAdminOrTechnician(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/history/{id}/attachments")
    public ResponseEntity<List<ServiceHistoryAttachmentDTO>> listAttachments(@PathVariable Long id) {
        Long clientId = currentClientIdOrNull();
        return ResponseEntity.ok(historyService.listAttachments(id, clientId, security.isAdminOrTechnician()));
    }

    @DeleteMapping("/attachments/{id}")
    public ResponseEntity<Void> deleteAttachment(@PathVariable Long id) {
        Long clientId = currentClientIdOrNull();
        historyService.deleteAttachment(id, clientId, security.isAdminOrTechnician());
        return ResponseEntity.noContent().build();
    }

    private static Long currentClientIdOrNull() {
        return SecurityUtils.currentUser()
            .map(AuthenticatedUser::getClientId)
            .orElse(null);
    }
}
