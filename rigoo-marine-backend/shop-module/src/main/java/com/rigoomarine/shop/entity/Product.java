package com.rigoomarine.shop.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false, unique = true, length = 100)
    private String sku;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(name = "name_ar")
    private String nameAr;

    @Column(name = "description_en", columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(name = "description_ar", columnDefinition = "TEXT")
    private String descriptionAr;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Category category;

    @Column(length = 100)
    private String brand;

    @Column(name = "price_qar", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceQar;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "stock_qty", nullable = false)
    private Integer stockQty;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "media_urls", columnDefinition = "TEXT")
    private String mediaUrls;

    @Column(name = "specs_en", columnDefinition = "TEXT")
    private String specsEn;

    @Column(name = "specs_ar", columnDefinition = "TEXT")
    private String specsAr;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "view_count", nullable = false)
    private Long viewCount;

    // Optimistic lock for stock decrement under concurrent webhook retries.
    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (status == null) status = Status.DRAFT;
        if (category == null) category = Category.PART;
        if (currency == null) currency = "QAR";
        if (stockQty == null) stockQty = 0;
        if (viewCount == null) viewCount = 0L;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Category { PART, TOOL }
    public enum Status { DRAFT, ACTIVE, ARCHIVED }
}
