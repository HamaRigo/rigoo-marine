package com.rigoomarine.marketplace.service;

import com.rigoomarine.marketplace.dto.BoatInquiryDTO;
import com.rigoomarine.marketplace.dto.CreateInquiryRequest;
import com.rigoomarine.marketplace.entity.BoatInquiry;
import com.rigoomarine.marketplace.repository.BoatInquiryRepository;
import com.rigoomarine.marketplace.repository.BoatListingRepository;
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
public class BoatInquiryService {

    private final BoatInquiryRepository inquiryRepository;
    private final BoatListingRepository listingRepository;

    public BoatInquiryDTO create(CreateInquiryRequest req) {
        BoatInquiry.InquiryType type = req.getInquiryType();
        Long listingId = req.getListingId();

        // Listing-bound types must reference an existing listing.
        // GENERAL may include a listingId (e.g., contact-from-detail-page) or not.
        boolean listingRequired = type == BoatInquiry.InquiryType.BUY
                || type == BoatInquiry.InquiryType.RENT
                || type == BoatInquiry.InquiryType.INSPECTION;
        if (listingRequired && listingId == null) {
            throw new IllegalArgumentException("listingId is required for " + type + " inquiries");
        }
        if (listingId != null && !listingRepository.existsById(listingId)) {
            throw new RuntimeException("Listing not found");
        }

        BoatInquiry inquiry = BoatInquiry.builder()
                .listingId(listingId)
                .userId(req.getUserId())
                .name(req.getName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .message(req.getMessage())
                .inquiryType(type)
                .build();
        return toDTO(inquiryRepository.save(inquiry));
    }

    public BoatInquiryDTO updateStatus(Long id, BoatInquiry.InquiryStatus status, String adminNotes) {
        BoatInquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inquiry not found"));
        inquiry.setStatus(status);
        if (adminNotes != null) inquiry.setAdminNotes(adminNotes);
        return toDTO(inquiryRepository.save(inquiry));
    }

    @Transactional(readOnly = true)
    public Page<BoatInquiryDTO> search(String status, String inquiryType, Long listingId, Pageable pageable) {
        Specification<BoatInquiry> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), BoatInquiry.InquiryStatus.valueOf(status)));
            }
            if (inquiryType != null && !inquiryType.isBlank()) {
                predicates.add(cb.equal(root.get("inquiryType"), BoatInquiry.InquiryType.valueOf(inquiryType)));
            }
            if (listingId != null) predicates.add(cb.equal(root.get("listingId"), listingId));
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return inquiryRepository.findAll(spec, pageable).map(this::toDTO);
    }

    private BoatInquiryDTO toDTO(BoatInquiry e) {
        return BoatInquiryDTO.builder()
                .id(e.getId())
                .listingId(e.getListingId())
                .userId(e.getUserId())
                .name(e.getName())
                .email(e.getEmail())
                .phone(e.getPhone())
                .message(e.getMessage())
                .inquiryType(e.getInquiryType() != null ? e.getInquiryType().name() : null)
                .status(e.getStatus() != null ? e.getStatus().name() : null)
                .adminNotes(e.getAdminNotes())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
