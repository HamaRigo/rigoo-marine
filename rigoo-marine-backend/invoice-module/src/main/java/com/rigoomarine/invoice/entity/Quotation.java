package com.rigoomarine.invoice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quotations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String quotationNumber;

    private Long clientId;

    @Column(name = "bill_to_name")
    private String billToName;

    @Column(name = "bill_to_email")
    private String billToEmail;

    @Column(name = "bill_to_phone")
    private String billToPhone;

    @Column(name = "bill_to_address")
    private String billToAddress;

    @Column(name = "bill_to_company")
    private String billToCompany;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private QuotationStatus status;

    @Column(nullable = false)
    private LocalDateTime issueDate;

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<QuotationItem> items = new ArrayList<>();

    @Column(precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(precision = 10, scale = 2)
    private BigDecimal taxRate;

    @Column(precision = 10, scale = 2)
    private BigDecimal taxAmount;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal total;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String terms;

    @Column(columnDefinition = "TEXT")
    private String termsArabic;

    @Column(columnDefinition = "TEXT")
    private String logoUrl;

    @ElementCollection
    @CollectionTable(name = "quotation_inserted_images", joinColumns = @JoinColumn(name = "quotation_id"))
    @Column(name = "image_url")
    @Builder.Default
    private java.util.List<String> insertedImages = new java.util.ArrayList<>();

    private String watermark;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (issueDate == null) {
            issueDate = LocalDateTime.now();
        }
        if (expiryDate == null) {
            expiryDate = issueDate.plusDays(14);
        }
        if (status == null) {
            status = QuotationStatus.DRAFT;
        }
        if (watermark == null) {
            watermark = "QUOTATION";
        }
        if (terms == null) {
            terms = "This quotation is valid for 14 days. Prices are subject to change after expiry date.";
        }
        if (termsArabic == null) {
            termsArabic = "هذا العرض صالح لمدة 14 يوماً. الأسعار قابلة للتغيير بعد تاريخ الانتهاء.";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum QuotationStatus {
        DRAFT,
        PENDING,
        ACCEPTED,
        REJECTED,
        EXPIRED
    }
}
