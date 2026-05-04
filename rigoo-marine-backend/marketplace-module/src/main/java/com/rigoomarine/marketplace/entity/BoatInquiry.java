package com.rigoomarine.marketplace.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "boat_inquiries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoatInquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nullable: GENERAL inquiries (homepage Contact us) need not reference a listing.
    // DB-level CHECK enforces that BUY/RENT/INSPECTION require a listing_id.
    @Column(name = "listing_id")
    private Long listingId;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    @Column(length = 50)
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "inquiry_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private InquiryType inquiryType;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private InquiryStatus status;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (status == null) status = InquiryStatus.NEW;
        if (inquiryType == null) inquiryType = InquiryType.GENERAL;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum InquiryType { BUY, RENT, INSPECTION, GENERAL }
    public enum InquiryStatus { NEW, IN_PROGRESS, CLOSED }
}
