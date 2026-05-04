package com.rigoomarine.marketplace.controller;

import com.rigoomarine.marketplace.dto.BoatInquiryDTO;
import com.rigoomarine.marketplace.dto.CreateInquiryRequest;
import com.rigoomarine.marketplace.entity.BoatInquiry;
import com.rigoomarine.marketplace.service.BoatInquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/listings/inquiries")
@RequiredArgsConstructor
public class BoatInquiryController {

    private final BoatInquiryService service;

    /**
     * Public — anyone (including guests) can submit an inquiry. Rate-limited at the gateway.
     */
    @PostMapping
    public ResponseEntity<BoatInquiryDTO> create(@Valid @RequestBody CreateInquiryRequest req) {
        return ResponseEntity.ok(service.create(req));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Page<BoatInquiryDTO>> search(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String inquiryType,
            @RequestParam(required = false) Long listingId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        String[] parts = sort.split(",", 2);
        Sort.Direction dir = parts.length > 1 && parts[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(dir, parts[0]));
        return ResponseEntity.ok(service.search(status, inquiryType, listingId, pageable));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/status")
    public ResponseEntity<BoatInquiryDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        BoatInquiry.InquiryStatus status = BoatInquiry.InquiryStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(service.updateStatus(id, status, body.get("adminNotes")));
    }
}
