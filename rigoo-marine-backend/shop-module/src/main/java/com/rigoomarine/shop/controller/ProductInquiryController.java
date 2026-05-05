package com.rigoomarine.shop.controller;

import com.rigoomarine.shop.dto.CreateProductInquiryRequest;
import com.rigoomarine.shop.dto.ProductInquiryDTO;
import com.rigoomarine.shop.entity.ProductInquiry;
import com.rigoomarine.shop.service.ProductInquiryService;
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
@RequestMapping("/api/products/inquiries")
@RequiredArgsConstructor
public class ProductInquiryController {

    private final ProductInquiryService service;

    /**
     * Public — anyone (including guests) can submit an inquiry. Rate-limited at the gateway.
     */
    @PostMapping
    public ResponseEntity<ProductInquiryDTO> create(@Valid @RequestBody CreateProductInquiryRequest req) {
        return ResponseEntity.ok(service.create(req));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Page<ProductInquiryDTO>> search(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String inquiryType,
            @RequestParam(required = false) Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        String[] parts = sort.split(",", 2);
        Sort.Direction dir = parts.length > 1 && parts[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(dir, parts[0]));
        return ResponseEntity.ok(service.search(status, inquiryType, productId, pageable));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/status")
    public ResponseEntity<ProductInquiryDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        ProductInquiry.InquiryStatus status = ProductInquiry.InquiryStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(service.updateStatus(id, status, body.get("adminNotes")));
    }
}
