package com.rigoomarine.invoice.controller;

import com.rigoomarine.invoice.dto.QuotationDTO;
import com.rigoomarine.invoice.dto.CreateQuotationRequest;
import com.rigoomarine.invoice.service.QuotationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/quotations")
@RequiredArgsConstructor
public class QuotationController {

    private final QuotationService quotationService;

    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    @PostMapping
    public ResponseEntity<QuotationDTO> createQuotation(@Valid @RequestBody CreateQuotationRequest request) {
        return ResponseEntity.ok(quotationService.createQuotation(request));
    }

    @GetMapping("/my")
    public ResponseEntity<List<QuotationDTO>> getMyQuotations(@RequestParam Long clientId) {
        return ResponseEntity.ok(quotationService.getQuotationsByClientId(clientId));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    @GetMapping
    public ResponseEntity<Page<QuotationDTO>> searchQuotations(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long clientId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        String[] parts = sort.split(",", 2);
        Sort.Direction dir = parts.length > 1 && parts[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(dir, parts[0]));
        return ResponseEntity.ok(quotationService.searchPaged(q, status, clientId, pageable));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    @GetMapping("/all")
    public ResponseEntity<List<QuotationDTO>> getAllQuotations() {
        return ResponseEntity.ok(quotationService.getAllQuotations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuotationDTO> getQuotationById(@PathVariable Long id) {
        return ResponseEntity.ok(quotationService.getQuotationById(id));
    }

    @GetMapping("/number/{quotationNumber}")
    public ResponseEntity<QuotationDTO> getQuotationByNumber(@PathVariable String quotationNumber) {
        return ResponseEntity.ok(quotationService.getQuotationByNumber(quotationNumber));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    @PutMapping("/{id}")
    public ResponseEntity<QuotationDTO> updateQuotation(
        @PathVariable Long id,
        @Valid @RequestBody CreateQuotationRequest request
    ) {
        return ResponseEntity.ok(quotationService.updateQuotation(id, request));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    @PutMapping("/{id}/status")
    public ResponseEntity<QuotationDTO> updateQuotationStatus(
        @PathVariable Long id,
        @RequestParam String status
    ) {
        return ResponseEntity.ok(quotationService.updateQuotationStatus(id, status));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuotation(@PathVariable Long id) {
        quotationService.deleteQuotation(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getQuotationPdf(@PathVariable Long id) {
        byte[] pdfContent = quotationService.generateQuotationPdf(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData(
            "attachment",
            "quotation-" + id + ".pdf"
        );

        return ResponseEntity.ok()
            .headers(headers)
            .body(pdfContent);
    }
}
