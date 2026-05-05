package com.rigoomarine.shop.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDTO {
    private Long id;
    private String slug;

    @Size(max = 100)
    private String sku;

    @NotBlank
    @Size(max = 255)
    private String nameEn;

    @Size(max = 255)
    private String nameAr;

    private String descriptionEn;
    private String descriptionAr;

    private String category;          // PART | TOOL
    private String brand;

    @NotNull
    @DecimalMin(value = "0.00", inclusive = true)
    private BigDecimal priceQar;

    private String currency;

    @Min(0)
    private Integer stockQty;

    private String status;            // DRAFT | ACTIVE | ARCHIVED

    private List<String> mediaUrls;

    private String specsEn;
    private String specsAr;

    private Long createdBy;
    private Long viewCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
