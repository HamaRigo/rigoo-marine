package com.rigoomarine.invoice.controller;

import com.rigoomarine.invoice.dto.QuotationDTO;
import com.rigoomarine.invoice.dto.CreateQuotationRequest;
import com.rigoomarine.invoice.service.QuotationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/quotations")
@RequiredArgsConstructor
public class QuotationController {

    private final QuotationService quotationService;

    @PostMapping
    public ResponseEntity<QuotationDTO> createQuotation(@Valid @RequestBody CreateQuotationRequest request) {
        return ResponseEntity.ok(quotationService.createQuotation(request));
    }

    @GetMapping("/my")
    public ResponseEntity<List<QuotationDTO>> getMyQuotations(@RequestParam Long clientId) {
        return ResponseEntity.ok(quotationService.getQuotationsByClientId(clientId));
    }

    @GetMapping
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

    @PutMapping("/{id}/status")
    public ResponseEntity<QuotationDTO> updateQuotationStatus(
        @PathVariable Long id,
        @RequestParam String status
    ) {
        return ResponseEntity.ok(quotationService.updateQuotationStatus(id, status));
    }

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
