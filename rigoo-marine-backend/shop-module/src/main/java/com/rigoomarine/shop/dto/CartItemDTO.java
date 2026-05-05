package com.rigoomarine.shop.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItemDTO {
    private Long id;
    private Long productId;
    private Integer quantity;
    // Joined product info for the cart drawer (avoids N+1 lookups on the frontend)
    private String slug;
    private String sku;
    private String nameEn;
    private String nameAr;
    private BigDecimal priceQar;
    private String imageUrl;
    private Integer stockQty;     // current stock so frontend can warn / cap
}
