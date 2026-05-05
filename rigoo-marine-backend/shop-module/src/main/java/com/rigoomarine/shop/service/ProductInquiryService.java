package com.rigoomarine.shop.service;

import com.rigoomarine.shop.dto.CreateProductInquiryRequest;
import com.rigoomarine.shop.dto.ProductInquiryDTO;
import com.rigoomarine.shop.entity.ProductInquiry;
import com.rigoomarine.shop.repository.ProductInquiryRepository;
import com.rigoomarine.shop.repository.ProductRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductInquiryService {

    private final ProductInquiryRepository inquiryRepository;
    private final ProductRepository productRepository;

    public ProductInquiryDTO create(CreateProductInquiryRequest req) {
        ProductInquiry.InquiryType type = req.getInquiryType();
        Long productId = req.getProductId();

        // Product-bound types must reference an existing product.
        // GENERAL may include a productId (e.g., contact-from-detail-page) or not.
        boolean productRequired = type == ProductInquiry.InquiryType.QUOTE
                || type == ProductInquiry.InquiryType.STOCK_CHECK;
        if (productRequired && productId == null) {
            throw new IllegalArgumentException("productId is required for " + type + " inquiries");
        }
        if (productId != null && !productRepository.existsById(productId)) {
            throw new RuntimeException("Product not found");
        }

        ProductInquiry inquiry = ProductInquiry.builder()
                .productId(productId)
                .userId(req.getUserId())
                .name(req.getName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .message(req.getMessage())
                .quantity(req.getQuantity())
                .inquiryType(type)
                .build();
        return toDTO(inquiryRepository.save(inquiry));
    }

    public ProductInquiryDTO updateStatus(Long id, ProductInquiry.InquiryStatus status, String adminNotes) {
        ProductInquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inquiry not found"));
        inquiry.setStatus(status);
        if (adminNotes != null) inquiry.setAdminNotes(adminNotes);
        return toDTO(inquiryRepository.save(inquiry));
    }

    @Transactional(readOnly = true)
    public Page<ProductInquiryDTO> search(String status, String inquiryType, Long productId, Pageable pageable) {
        Specification<ProductInquiry> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), ProductInquiry.InquiryStatus.valueOf(status)));
            }
            if (inquiryType != null && !inquiryType.isBlank()) {
                predicates.add(cb.equal(root.get("inquiryType"), ProductInquiry.InquiryType.valueOf(inquiryType)));
            }
            if (productId != null) predicates.add(cb.equal(root.get("productId"), productId));
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return inquiryRepository.findAll(spec, pageable).map(this::toDTO);
    }

    private ProductInquiryDTO toDTO(ProductInquiry e) {
        return ProductInquiryDTO.builder()
                .id(e.getId())
                .productId(e.getProductId())
                .userId(e.getUserId())
                .name(e.getName())
                .email(e.getEmail())
                .phone(e.getPhone())
                .message(e.getMessage())
                .quantity(e.getQuantity())
                .inquiryType(e.getInquiryType() != null ? e.getInquiryType().name() : null)
                .status(e.getStatus() != null ? e.getStatus().name() : null)
                .adminNotes(e.getAdminNotes())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
