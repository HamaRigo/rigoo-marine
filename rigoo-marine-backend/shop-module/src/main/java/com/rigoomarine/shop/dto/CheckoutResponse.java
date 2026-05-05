package com.rigoomarine.shop.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutResponse {
    private Long orderId;
    private String orderNumber;
    private String checkoutUrl;     // Stripe-hosted checkout page
    private String sessionId;
}
