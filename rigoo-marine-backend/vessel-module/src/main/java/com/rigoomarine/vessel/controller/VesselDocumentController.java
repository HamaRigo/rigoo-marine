package com.rigoomarine.vessel.controller;

import com.rigoomarine.vessel.dto.CreateVesselDocumentRequest;
import com.rigoomarine.vessel.dto.VesselDocumentDTO;
import com.rigoomarine.vessel.service.VesselDocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;

/**
 * Vessel document vault.
 * All endpoints are secured by vessel ownership (checked inside the service).
 */
@RestController
@RequiredArgsConstructor
public class VesselDocumentController {

    private final VesselDocumentService documentService;

    @GetMapping("/api/vessels/{vesselId}/documents")
    public ResponseEntity<List<VesselDocumentDTO>> listDocuments(
        @PathVariable Long vesselId
    ) {
        return ResponseEntity.ok(documentService.listForVessel(vesselId));
    }

    @PostMapping("/api/vessels/{vesselId}/documents")
    public ResponseEntity<VesselDocumentDTO> addDocument(
        @PathVariable Long vesselId,
        @Valid @RequestBody CreateVesselDocumentRequest request
    ) {
        VesselDocumentDTO created = documentService.addDocument(vesselId, request);
        URI location = URI.create("/api/vessels/" + vesselId + "/documents/" + created.getId());
        return ResponseEntity.created(location).body(created);
    }

    @DeleteMapping("/api/vessels/documents/{documentId}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long documentId) {
        documentService.deleteDocument(documentId);
        return ResponseEntity.noContent().build();
    }
}
