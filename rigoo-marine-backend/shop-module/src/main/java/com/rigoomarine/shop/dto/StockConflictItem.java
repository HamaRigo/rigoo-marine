package com.rigoomarine.shop.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockConflictItem {
    private Long productId;
    private String nameEn;
    private Integer requested;
    private Integer available;
}
