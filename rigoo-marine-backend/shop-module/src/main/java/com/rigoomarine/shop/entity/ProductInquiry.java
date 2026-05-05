package com.rigoomarine.shop.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "product_inquiries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductInquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nullable: GENERAL inquiries need not reference a product.
    // DB-level CHECK enforces that QUOTE/STOCK_CHECK require a product_id.
    @Column(name = "product_id")
    private Long productId;

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

    private Integer quantity;

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

    public enum InquiryType { QUOTE, STOCK_CHECK, GENERAL }
    public enum InquiryStatus { NEW, IN_PROGRESS, CLOSED }
}
