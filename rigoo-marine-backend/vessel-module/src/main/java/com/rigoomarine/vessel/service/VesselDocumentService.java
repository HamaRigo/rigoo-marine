package com.rigoomarine.vessel.service;

import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.vessel.dto.CreateVesselDocumentRequest;
import com.rigoomarine.vessel.dto.VesselDocumentDTO;
import com.rigoomarine.vessel.entity.VesselDocument;
import com.rigoomarine.vessel.exception.VesselNotFoundException;
import com.rigoomarine.vessel.repository.VesselDocumentRepository;
import com.rigoomarine.vessel.repository.VesselRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VesselDocumentService {

    private static final int EXPIRY_ALERT_DAYS = 30;

    private final VesselDocumentRepository documentRepository;
    private final VesselRepository         vesselRepository;
    private final VesselSecurity           vesselSecurity;

    @Transactional(readOnly = true)
    public List<VesselDocumentDTO> listForVessel(Long vesselId) {
        assertExists(vesselId);
        vesselSecurity.assertCanAccess(vesselId);
        return documentRepository.findByVesselIdOrdered(vesselId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public VesselDocumentDTO addDocument(Long vesselId, CreateVesselDocumentRequest request) {
        assertExists(vesselId);
        vesselSecurity.assertCanAccess(vesselId);

        Long clientId = SecurityUtils.currentClientIdOrThrow();

        VesselDocument doc = VesselDocument.builder()
            .vesselId(vesselId)
            .clientId(clientId)
            .documentType(request.getDocumentType())
            .documentName(request.getDocumentName())
            .url(request.getUrl())
            .fileSize(request.getFileSize())
            .mimeType(request.getMimeType())
            .issueDate(request.getIssueDate())
            .expiryDate(request.getExpiryDate())
            .notes(request.getNotes())
            .build();

        return toDTO(documentRepository.save(doc));
    }

    public void deleteDocument(Long documentId) {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        boolean isAdmin = SecurityUtils.currentUser()
            .map(u -> u.hasRole("ADMIN")).orElse(false);

        VesselDocument doc = isAdmin
            ? documentRepository.findById(documentId)
                .orElseThrow(() -> notFound(documentId))
            : documentRepository.findByIdAndClientId(documentId, clientId)
                .orElseThrow(() -> notFound(documentId));

        logAdminMutation(documentId, doc.getClientId(), "DELETE_DOCUMENT");
        documentRepository.delete(doc);
    }

    // ── Mapper ─────────────────────────────────────────────────────────────

    private VesselDocumentDTO toDTO(VesselDocument d) {
        LocalDate today = LocalDate.now();
        boolean expired      = d.getExpiryDate() != null && d.getExpiryDate().isBefore(today);
        boolean expiringSoon = !expired && d.getExpiryDate() != null
            && !d.getExpiryDate().isAfter(today.plusDays(EXPIRY_ALERT_DAYS));

        return VesselDocumentDTO.builder()
            .id(d.getId())
            .vesselId(d.getVesselId())
            .documentType(d.getDocumentType())
            .documentName(d.getDocumentName())
            .url(d.getUrl())
            .fileSize(d.getFileSize())
            .mimeType(d.getMimeType())
            .issueDate(d.getIssueDate())
            .expiryDate(d.getExpiryDate())
            .notes(d.getNotes())
            .createdAt(d.getCreatedAt())
            .expired(expired)
            .expiringSoon(expiringSoon)
            .build();
    }

    private void assertExists(Long vesselId) {
        if (!vesselRepository.existsById(vesselId)) throw new VesselNotFoundException(vesselId);
    }

    private ResponseStatusException notFound(Long id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found: " + id);
    }

    private void logAdminMutation(Long docId, Long ownerId, String op) {
        SecurityUtils.currentUser().ifPresent(u -> {
            if (u.hasRole("ADMIN") && !ownerId.equals(u.getClientId())) {
                log.info("audit.admin_edit docId={} owner={} actor={} op={}", docId, ownerId, u.getEmail(), op);
            }
        });
    }
}
