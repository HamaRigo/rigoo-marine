package com.rigoomarine.shop.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDTO {
    private Long id;
    private String orderNumber;
    private String userEmail;
    private String status;
    private BigDecimal subtotalQar;
    private BigDecimal taxQar;
    private BigDecimal totalQar;
    private String currency;
    private String stripeSessionId;
    private String notes;
    private List<OrderItemDTO> items;
    private LocalDateTime paidAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
