package com.rigoomarine.shop.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemDTO {
    private Long id;
    private Long productId;
    private String sku;
    private String nameEn;
    private String nameAr;
    private BigDecimal priceQar;
    private String imageUrl;
    private Integer quantity;
    private BigDecimal lineTotalQar;
}
