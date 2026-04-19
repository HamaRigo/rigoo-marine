package com.rigoomarine.invoice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String invoiceNumber;

    @Column(nullable = false)
    private Long workOrderId;

    @Column(nullable = false)
    private Long clientId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private InvoiceStatus status;

    @Column(nullable = false)
    private LocalDateTime issueDate;

    @Column(nullable = false)
    private LocalDateTime dueDate;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "invoice_id")
    @Builder.Default
    private List<InvoiceItem> items = new ArrayList<>();

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
    @CollectionTable(name = "invoice_inserted_images", joinColumns = @JoinColumn(name = "invoice_id"))
    @Column(name = "image_url")
    @Builder.Default
    private java.util.List<String> insertedImages = new java.util.ArrayList<>();

    private String watermark;

    private String qrCode;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

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
        if (dueDate == null) {
            dueDate = issueDate.plusDays(30);
        }
        if (status == null) {
            status = InvoiceStatus.PENDING;
        }
        if (watermark == null) {
            watermark = "CONFIDENTIAL";
        }
        if (terms == null) {
            terms = "Payment is due within 30 days. Late payments may incur additional charges.";
        }
        if (termsArabic == null) {
            termsArabic = "الدفع مستحق خلال 30 يوماً. قد تتحمل المدفوعات المتأخرة رسوماً إضافية.";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum InvoiceStatus {
        DRAFT,
        PENDING,
        PAID,
        OVERDUE,
        CANCELLED
    }
}
