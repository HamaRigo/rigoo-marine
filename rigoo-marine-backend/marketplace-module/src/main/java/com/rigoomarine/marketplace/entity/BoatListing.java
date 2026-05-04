package com.rigoomarine.marketplace.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "boat_listings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoatListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "title_en", nullable = false)
    private String titleEn;

    @Column(name = "title_ar")
    private String titleAr;

    @Column(name = "description_en", columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ListingStatus status;

    @Column(name = "seller_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private SellerType sellerType;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "listing_id_external", unique = true, length = 50)
    private String listingIdExternal;

    // Mode + pricing
    @Column(name = "for_sale", nullable = false)
    private Boolean forSale;

    @Column(name = "sale_price", precision = 12, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "for_rent", nullable = false)
    private Boolean forRent;

    @Column(name = "daily_rate", precision = 12, scale = 2)
    private BigDecimal dailyRate;

    @Column(name = "weekly_rate", precision = 12, scale = 2)
    private BigDecimal weeklyRate;

    @Column(name = "min_rental_nights")
    private Integer minRentalNights;

    @Column(name = "max_rental_nights")
    private Integer maxRentalNights;

    @Column(name = "cleaning_fee", precision = 12, scale = 2)
    private BigDecimal cleaningFee;

    @Column(name = "rental_security_deposit", precision = 12, scale = 2)
    private BigDecimal rentalSecurityDeposit;

    @Column(name = "captain_required", length = 20)
    @Enumerated(EnumType.STRING)
    private CaptainRequired captainRequired;

    @Column(name = "captain_daily_fee", precision = 12, scale = 2)
    private BigDecimal captainDailyFee;

    @Column(nullable = false, length = 3)
    private String currency;

    // Specs
    @Column(name = "boat_type", length = 50)
    private String boatType;

    private String brand;
    private String model;

    @Column(name = "year_built")
    private Integer yearBuilt;

    @Column(name = "length_meters", precision = 6, scale = 2)
    private BigDecimal lengthMeters;

    @Column(name = "beam_meters", precision = 6, scale = 2)
    private BigDecimal beamMeters;

    @Column(name = "draft_meters", precision = 6, scale = 2)
    private BigDecimal draftMeters;

    @Column(name = "displacement_kg", precision = 10, scale = 2)
    private BigDecimal displacementKg;

    @Column(name = "hull_material", length = 50)
    private String hullMaterial;

    @Column(name = "fuel_capacity_liters", precision = 8, scale = 2)
    private BigDecimal fuelCapacityLiters;

    @Column(name = "water_capacity_liters", precision = 8, scale = 2)
    private BigDecimal waterCapacityLiters;

    @Column(name = "sleeping_berths")
    private Integer sleepingBerths;

    // Engine + systems
    @Column(name = "engine_make")
    private String engineMake;

    @Column(name = "engine_model")
    private String engineModel;

    @Column(name = "engine_hours")
    private Integer engineHours;

    @Column(name = "fuel_type", length = 50)
    private String fuelType;

    @Column(name = "has_generator")
    private Boolean hasGenerator;

    @Column(name = "has_gps")
    private Boolean hasGps;

    @Column(name = "has_radar")
    private Boolean hasRadar;

    @Column(name = "has_autopilot")
    private Boolean hasAutopilot;

    @Column(name = "has_ais")
    private Boolean hasAis;

    @Column(name = "has_air_conditioning")
    private Boolean hasAirConditioning;

    @Column(name = "has_heating")
    private Boolean hasHeating;

    @Column(name = "has_watermaker")
    private Boolean hasWatermaker;

    @Column(name = "has_solar")
    private Boolean hasSolar;

    @Column(name = "battery_count")
    private Integer batteryCount;

    // Condition
    @Column(name = "last_survey_date")
    private LocalDate lastSurveyDate;

    @Column(name = "last_antifoul_date")
    private LocalDate lastAntifoulDate;

    @Column(name = "last_engine_service_date")
    private LocalDate lastEngineServiceDate;

    @Column(name = "known_issues_en", columnDefinition = "TEXT")
    private String knownIssuesEn;

    @Column(name = "known_issues_ar", columnDefinition = "TEXT")
    private String knownIssuesAr;

    @Column(name = "inclusions_en", columnDefinition = "TEXT")
    private String inclusionsEn;

    @Column(name = "inclusions_ar", columnDefinition = "TEXT")
    private String inclusionsAr;

    // Location
    @Column(name = "location_text")
    private String locationText;

    @Column(name = "location_marina")
    private String locationMarina;

    @Column(name = "location_city", length = 100)
    private String locationCity;

    @Column(name = "location_country", length = 100)
    private String locationCountry;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    // Documents + pricing context
    @Column(name = "registration_country", length = 100)
    private String registrationCountry;

    @Column(name = "ownership_status", length = 100)
    private String ownershipStatus;

    @Column(name = "lien_free")
    private Boolean lienFree;

    @Column(name = "spec_sheet_url", columnDefinition = "TEXT")
    private String specSheetUrl;

    @Column(name = "financing_notes", columnDefinition = "TEXT")
    private String financingNotes;

    @Column(name = "vat_status", length = 100)
    private String vatStatus;

    // Media (JSON-serialized in TEXT for now; pull a real array column when we move to JSONB)
    @Column(name = "media_urls", columnDefinition = "TEXT")
    private String mediaUrls;

    @Column(name = "video_url", columnDefinition = "TEXT")
    private String videoUrl;

    // Trust signals
    @Column(name = "seller_verified")
    private Boolean sellerVerified;

    @Column(name = "view_count", nullable = false)
    private Long viewCount;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (status == null) status = ListingStatus.DRAFT;
        if (sellerType == null) sellerType = SellerType.DEALER;
        if (forSale == null) forSale = false;
        if (forRent == null) forRent = false;
        if (currency == null) currency = "QAR";
        if (viewCount == null) viewCount = 0L;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ListingStatus { DRAFT, AVAILABLE, RESERVED, SOLD, ARCHIVED }
    public enum SellerType { DEALER, PRIVATE }
    public enum CaptainRequired { NEVER, OPTIONAL, INCLUDED }
}
