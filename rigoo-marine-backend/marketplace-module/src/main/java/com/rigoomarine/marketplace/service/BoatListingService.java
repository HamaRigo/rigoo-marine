package com.rigoomarine.marketplace.service;

import com.rigoomarine.marketplace.dto.BoatListingDTO;
import com.rigoomarine.marketplace.entity.BoatListing;
import com.rigoomarine.marketplace.kafka.ListingEventPublisher;
import com.rigoomarine.marketplace.repository.BoatListingRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BoatListingService {

    private final BoatListingRepository repository;
    private final ListingEventPublisher eventPublisher;

    private static final Pattern QUOTED = Pattern.compile("\"([^\"]+)\"");

    @Transactional(readOnly = true)
    public List<String> getDistinctBoatTypes() {
        return repository.findDistinctBoatTypes();
    }

    public BoatListingDTO create(BoatListingDTO dto) {
        BoatListing entity = fromDTO(dto, new BoatListing());
        // Slug is NOT NULL — generate before insert so the row is valid in one trip.
        // UUID suffix keeps slugs collision-free without needing the (post-insert) id.
        if (entity.getSlug() == null || entity.getSlug().isBlank()) {
            entity.setSlug(generateSlug(entity.getTitleEn()));
        }
        return toDTO(repository.save(entity));
    }

    public BoatListingDTO update(Long id, BoatListingDTO dto) {
        BoatListing entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Listing not found"));
        fromDTO(dto, entity);
        return toDTO(repository.save(entity));
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public BoatListingDTO submit(BoatListingDTO dto, Long submitterId) {
        BoatListing entity = fromDTO(dto, new BoatListing());
        if (entity.getSlug() == null || entity.getSlug().isBlank()) {
            entity.setSlug(generateSlug(entity.getTitleEn()));
        }
        entity.setStatus(BoatListing.ListingStatus.PENDING_REVIEW);
        entity.setSellerType(BoatListing.SellerType.PRIVATE);
        entity.setCreatedBy(submitterId);
        return toDTO(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<BoatListingDTO> getMyListings(Long userId) {
        return repository.findByCreatedByOrderByCreatedAtDesc(userId)
                .stream().map(this::toDTO).toList();
    }

    public BoatListingDTO approve(Long id, java.math.BigDecimal companyGainPct,
                                   String reviewerEmail, String reviewerRole) {
        BoatListing entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Listing not found"));
        entity.setStatus(BoatListing.ListingStatus.AVAILABLE);
        entity.setCompanyGainPct(companyGainPct);
        entity.setRejectionReason(null);
        entity.setReviewedByEmail(reviewerEmail);
        entity.setReviewedByRole(reviewerRole);
        entity.setReviewedAt(LocalDateTime.now());
        BoatListingDTO result = toDTO(repository.save(entity));
        eventPublisher.publishApproved(entity.getId(), entity.getTitleEn(),
                entity.getCreatedBy(), reviewerEmail, reviewerRole, companyGainPct);
        return result;
    }

    public BoatListingDTO reject(Long id, String reason,
                                  String reviewerEmail, String reviewerRole) {
        BoatListing entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Listing not found"));
        entity.setStatus(BoatListing.ListingStatus.REJECTED);
        entity.setRejectionReason(reason);
        entity.setReviewedByEmail(reviewerEmail);
        entity.setReviewedByRole(reviewerRole);
        entity.setReviewedAt(LocalDateTime.now());
        BoatListingDTO result = toDTO(repository.save(entity));
        eventPublisher.publishRejected(entity.getId(), entity.getTitleEn(),
                entity.getCreatedBy(), reviewerEmail, reviewerRole, reason);
        return result;
    }

    @Transactional(readOnly = true)
    public BoatListingDTO getById(Long id) {
        BoatListing entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Listing not found"));
        return toDTO(entity);
    }

    @Transactional(readOnly = true)
    public BoatListingDTO getBySlug(String slug) {
        BoatListing entity = repository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Listing not found"));
        return toDTO(entity);
    }

    private static String generateSlug(String titleEn) {
        String base = (titleEn == null ? "boat" : titleEn).toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (base.isEmpty()) base = "boat";
        if (base.length() > 200) base = base.substring(0, 200);
        return base + "-" + java.util.UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * Public search with filters per the gallery filter spec:
     * mode (BUY|RENT), boatType, length range, year range, price/rate range, location text.
     * Drafts/archived are hidden unless the caller explicitly asks for "ALL" (admin use).
     */
    @Transactional(readOnly = true)
    public Page<BoatListingDTO> search(
            String mode,
            String q,
            String boatType,
            BigDecimal lengthMin,
            BigDecimal lengthMax,
            Integer yearMin,
            Integer yearMax,
            BigDecimal priceMin,
            BigDecimal priceMax,
            String location,
            String adminStatus,           // optional: ADMIN can filter by status
            boolean canUseAdminStatus,
            Pageable pageable
    ) {
        Specification<BoatListing> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Public callers see only AVAILABLE + RESERVED. Admin can override via adminStatus.
            if (canUseAdminStatus && adminStatus != null && !adminStatus.isBlank() && !"ALL".equalsIgnoreCase(adminStatus)) {
                predicates.add(cb.equal(root.get("status"), parseListingStatus(adminStatus)));
            } else if (!canUseAdminStatus || adminStatus == null || adminStatus.isBlank()) {
                predicates.add(root.get("status").in(
                        BoatListing.ListingStatus.AVAILABLE, BoatListing.ListingStatus.RESERVED));
            }

            if ("BUY".equalsIgnoreCase(mode)) {
                predicates.add(cb.isTrue(root.get("forSale")));
            } else if ("RENT".equalsIgnoreCase(mode)) {
                predicates.add(cb.isTrue(root.get("forRent")));
            }

            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("titleEn")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("titleAr"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("descriptionEn"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("descriptionAr"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("brand"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("model"), "")), like)
                ));
            }
            if (boatType != null && !boatType.isBlank()) {
                predicates.add(cb.equal(root.get("boatType"), boatType));
            }
            if (lengthMin != null) predicates.add(cb.greaterThanOrEqualTo(root.get("lengthMeters"), lengthMin));
            if (lengthMax != null) predicates.add(cb.lessThanOrEqualTo(root.get("lengthMeters"), lengthMax));
            if (yearMin != null) predicates.add(cb.greaterThanOrEqualTo(root.get("yearBuilt"), yearMin));
            if (yearMax != null) predicates.add(cb.lessThanOrEqualTo(root.get("yearBuilt"), yearMax));

            if (priceMin != null || priceMax != null) {
                // Price filter applies to whichever pricing column matches the mode.
                String priceColumn = "RENT".equalsIgnoreCase(mode) ? "dailyRate" : "salePrice";
                if (priceMin != null) predicates.add(cb.greaterThanOrEqualTo(root.get(priceColumn), priceMin));
                if (priceMax != null) predicates.add(cb.lessThanOrEqualTo(root.get(priceColumn), priceMax));
            }

            if (location != null && !location.isBlank()) {
                String like = "%" + location.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("locationText"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("locationCity"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("locationMarina"), "")), like)
                ));
            }
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return repository.findAll(spec, pageable).map(this::toDTO);
    }

    private static BoatListing.ListingStatus parseListingStatus(String status) {
        try {
            return BoatListing.ListingStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid listing status: " + status);
        }
    }

    // -------- Mapping --------

    private BoatListing fromDTO(BoatListingDTO d, BoatListing e) {
        // slug is admin-overridable on update; auto-generated on create when blank.
        if (d.getSlug() != null && !d.getSlug().isBlank()) e.setSlug(d.getSlug());
        e.setTitleEn(d.getTitleEn());
        e.setTitleAr(d.getTitleAr());
        e.setDescriptionEn(d.getDescriptionEn());
        e.setDescriptionAr(d.getDescriptionAr());
        if (d.getStatus() != null) e.setStatus(BoatListing.ListingStatus.valueOf(d.getStatus()));
        if (d.getSellerType() != null) e.setSellerType(BoatListing.SellerType.valueOf(d.getSellerType()));
        e.setCreatedBy(d.getCreatedBy());
        e.setListingIdExternal(d.getListingIdExternal());

        e.setForSale(Boolean.TRUE.equals(d.getForSale()));
        e.setSalePrice(d.getSalePrice());
        e.setForRent(Boolean.TRUE.equals(d.getForRent()));
        e.setDailyRate(d.getDailyRate());
        e.setWeeklyRate(d.getWeeklyRate());
        e.setMinRentalNights(d.getMinRentalNights());
        e.setMaxRentalNights(d.getMaxRentalNights());
        e.setCleaningFee(d.getCleaningFee());
        e.setRentalSecurityDeposit(d.getRentalSecurityDeposit());
        if (d.getCaptainRequired() != null) {
            e.setCaptainRequired(BoatListing.CaptainRequired.valueOf(d.getCaptainRequired()));
        }
        e.setCaptainDailyFee(d.getCaptainDailyFee());
        e.setCurrency(d.getCurrency() != null ? d.getCurrency() : "QAR");

        e.setBoatType(d.getBoatType());
        e.setBrand(d.getBrand());
        e.setModel(d.getModel());
        e.setYearBuilt(d.getYearBuilt());
        e.setLengthMeters(d.getLengthMeters());
        e.setBeamMeters(d.getBeamMeters());
        e.setDraftMeters(d.getDraftMeters());
        e.setDisplacementKg(d.getDisplacementKg());
        e.setHullMaterial(d.getHullMaterial());
        e.setFuelCapacityLiters(d.getFuelCapacityLiters());
        e.setWaterCapacityLiters(d.getWaterCapacityLiters());
        e.setSleepingBerths(d.getSleepingBerths());

        e.setEngineMake(d.getEngineMake());
        e.setEngineModel(d.getEngineModel());
        e.setEngineHours(d.getEngineHours());
        e.setFuelType(d.getFuelType());
        e.setHasGenerator(d.getHasGenerator());
        e.setHasGps(d.getHasGps());
        e.setHasRadar(d.getHasRadar());
        e.setHasAutopilot(d.getHasAutopilot());
        e.setHasAis(d.getHasAis());
        e.setHasAirConditioning(d.getHasAirConditioning());
        e.setHasHeating(d.getHasHeating());
        e.setHasWatermaker(d.getHasWatermaker());
        e.setHasSolar(d.getHasSolar());
        e.setBatteryCount(d.getBatteryCount());

        e.setLastSurveyDate(d.getLastSurveyDate());
        e.setLastAntifoulDate(d.getLastAntifoulDate());
        e.setLastEngineServiceDate(d.getLastEngineServiceDate());
        e.setKnownIssuesEn(d.getKnownIssuesEn());
        e.setKnownIssuesAr(d.getKnownIssuesAr());
        e.setInclusionsEn(d.getInclusionsEn());
        e.setInclusionsAr(d.getInclusionsAr());

        e.setLocationText(d.getLocationText());
        e.setLocationMarina(d.getLocationMarina());
        e.setLocationCity(d.getLocationCity());
        e.setLocationCountry(d.getLocationCountry() != null ? d.getLocationCountry() : "Qatar");
        e.setLatitude(d.getLatitude());
        e.setLongitude(d.getLongitude());

        e.setRegistrationCountry(d.getRegistrationCountry());
        e.setOwnershipStatus(d.getOwnershipStatus());
        e.setLienFree(d.getLienFree());
        e.setSpecSheetUrl(d.getSpecSheetUrl());
        e.setFinancingNotes(d.getFinancingNotes());
        e.setVatStatus(d.getVatStatus());

        e.setMediaUrls(serializeUrls(d.getMediaUrls()));
        e.setVideoUrl(d.getVideoUrl());
        e.setSellerVerified(d.getSellerVerified());
        if (d.getViewCount() != null) e.setViewCount(d.getViewCount());
        if (d.getCompanyGainPct() != null) e.setCompanyGainPct(d.getCompanyGainPct());
        if (d.getRejectionReason() != null) e.setRejectionReason(d.getRejectionReason());

        return e;
    }

    private BoatListingDTO toDTO(BoatListing e) {
        return BoatListingDTO.builder()
                .id(e.getId())
                .slug(e.getSlug())
                .titleEn(e.getTitleEn())
                .titleAr(e.getTitleAr())
                .descriptionEn(e.getDescriptionEn())
                .descriptionAr(e.getDescriptionAr())
                .status(e.getStatus() != null ? e.getStatus().name() : null)
                .sellerType(e.getSellerType() != null ? e.getSellerType().name() : null)
                .createdBy(e.getCreatedBy())
                .listingIdExternal(e.getListingIdExternal())
                .forSale(e.getForSale())
                .salePrice(e.getSalePrice())
                .forRent(e.getForRent())
                .dailyRate(e.getDailyRate())
                .weeklyRate(e.getWeeklyRate())
                .minRentalNights(e.getMinRentalNights())
                .maxRentalNights(e.getMaxRentalNights())
                .cleaningFee(e.getCleaningFee())
                .rentalSecurityDeposit(e.getRentalSecurityDeposit())
                .captainRequired(e.getCaptainRequired() != null ? e.getCaptainRequired().name() : null)
                .captainDailyFee(e.getCaptainDailyFee())
                .currency(e.getCurrency())
                .boatType(e.getBoatType())
                .brand(e.getBrand())
                .model(e.getModel())
                .yearBuilt(e.getYearBuilt())
                .lengthMeters(e.getLengthMeters())
                .beamMeters(e.getBeamMeters())
                .draftMeters(e.getDraftMeters())
                .displacementKg(e.getDisplacementKg())
                .hullMaterial(e.getHullMaterial())
                .fuelCapacityLiters(e.getFuelCapacityLiters())
                .waterCapacityLiters(e.getWaterCapacityLiters())
                .sleepingBerths(e.getSleepingBerths())
                .engineMake(e.getEngineMake())
                .engineModel(e.getEngineModel())
                .engineHours(e.getEngineHours())
                .fuelType(e.getFuelType())
                .hasGenerator(e.getHasGenerator())
                .hasGps(e.getHasGps())
                .hasRadar(e.getHasRadar())
                .hasAutopilot(e.getHasAutopilot())
                .hasAis(e.getHasAis())
                .hasAirConditioning(e.getHasAirConditioning())
                .hasHeating(e.getHasHeating())
                .hasWatermaker(e.getHasWatermaker())
                .hasSolar(e.getHasSolar())
                .batteryCount(e.getBatteryCount())
                .lastSurveyDate(e.getLastSurveyDate())
                .lastAntifoulDate(e.getLastAntifoulDate())
                .lastEngineServiceDate(e.getLastEngineServiceDate())
                .knownIssuesEn(e.getKnownIssuesEn())
                .knownIssuesAr(e.getKnownIssuesAr())
                .inclusionsEn(e.getInclusionsEn())
                .inclusionsAr(e.getInclusionsAr())
                .locationText(e.getLocationText())
                .locationMarina(e.getLocationMarina())
                .locationCity(e.getLocationCity())
                .locationCountry(e.getLocationCountry())
                .latitude(e.getLatitude())
                .longitude(e.getLongitude())
                .registrationCountry(e.getRegistrationCountry())
                .ownershipStatus(e.getOwnershipStatus())
                .lienFree(e.getLienFree())
                .specSheetUrl(e.getSpecSheetUrl())
                .financingNotes(e.getFinancingNotes())
                .vatStatus(e.getVatStatus())
                .mediaUrls(parseUrls(e.getMediaUrls()))
                .videoUrl(e.getVideoUrl())
                .sellerVerified(e.getSellerVerified())
                .viewCount(e.getViewCount())
                .companyGainPct(e.getCompanyGainPct())
                .rejectionReason(e.getRejectionReason())
                .reviewedByEmail(e.getReviewedByEmail())
                .reviewedByRole(e.getReviewedByRole())
                .reviewedAt(e.getReviewedAt())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private String serializeUrls(List<String> urls) {
        if (urls == null || urls.isEmpty()) return null;
        return urls.stream()
                .filter(u -> u != null && !u.isBlank())
                .map(u -> "\"" + u.replace("\"", "\\\"") + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private List<String> parseUrls(String json) {
        if (json == null || !json.startsWith("[")) return List.of();
        Matcher m = QUOTED.matcher(json);
        List<String> out = new ArrayList<>();
        while (m.find()) out.add(m.group(1));
        return out;
    }
}
