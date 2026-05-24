package com.rigoomarine.marketplace.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoatListingDTO {
    private Long id;
    private String slug;
    private String titleEn;
    private String titleAr;
    private String descriptionEn;
    private String descriptionAr;
    private String status;
    private String sellerType;
    private Long createdBy;
    private String listingIdExternal;

    private Boolean forSale;
    private BigDecimal salePrice;
    private Boolean forRent;
    private BigDecimal dailyRate;
    private BigDecimal weeklyRate;
    private Integer minRentalNights;
    private Integer maxRentalNights;
    private BigDecimal cleaningFee;
    private BigDecimal rentalSecurityDeposit;
    private String captainRequired;
    private BigDecimal captainDailyFee;
    private String currency;

    private String boatType;
    private String brand;
    private String model;
    private Integer yearBuilt;
    private BigDecimal lengthMeters;
    private BigDecimal beamMeters;
    private BigDecimal draftMeters;
    private BigDecimal displacementKg;
    private String hullMaterial;
    private BigDecimal fuelCapacityLiters;
    private BigDecimal waterCapacityLiters;
    private Integer sleepingBerths;

    private String engineMake;
    private String engineModel;
    private Integer engineHours;
    private String fuelType;
    private Boolean hasGenerator;
    private Boolean hasGps;
    private Boolean hasRadar;
    private Boolean hasAutopilot;
    private Boolean hasAis;
    private Boolean hasAirConditioning;
    private Boolean hasHeating;
    private Boolean hasWatermaker;
    private Boolean hasSolar;
    private Integer batteryCount;

    private LocalDate lastSurveyDate;
    private LocalDate lastAntifoulDate;
    private LocalDate lastEngineServiceDate;
    private String knownIssuesEn;
    private String knownIssuesAr;
    private String inclusionsEn;
    private String inclusionsAr;

    private String locationText;
    private String locationMarina;
    private String locationCity;
    private String locationCountry;
    private BigDecimal latitude;
    private BigDecimal longitude;

    private String registrationCountry;
    private String ownershipStatus;
    private Boolean lienFree;
    private String specSheetUrl;
    private String financingNotes;
    private String vatStatus;

    private List<String> mediaUrls;
    private String videoUrl;

    private Boolean sellerVerified;
    private Long viewCount;

    private BigDecimal companyGainPct;
    private String rejectionReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
