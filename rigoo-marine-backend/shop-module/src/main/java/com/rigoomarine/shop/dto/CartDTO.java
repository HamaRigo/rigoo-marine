package com.rigoomarine.shop.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartDTO {
    private Long id;
    private String userEmail;
    private List<CartItemDTO> items;
    private BigDecimal subtotalQar;
    private Integer itemCount;       // sum of quantities — for the navbar badge
}
