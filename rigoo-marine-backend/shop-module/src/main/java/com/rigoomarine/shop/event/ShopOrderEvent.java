package com.rigoomarine.shop.event;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Shop order lifecycle event published to Kafka topic <code>shop.order.status</code>.
 * Consumed by notification-service to send the customer an email + create an in-app notification.
 *
 * Kept deliberately flat (no nested objects) so the consumer doesn't need shop-module's classes
 * on its classpath — Spring's JsonDeserializer constructs a generic LinkedHashMap.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopOrderEvent {
    private String type;            // "ORDER_PAID" | "ORDER_CANCELLED" (future)
    private Long orderId;
    private String orderNumber;
    private String userEmail;
    private String status;          // PENDING_PAYMENT | PAID | CANCELLED | REFUNDED
    private BigDecimal totalQar;
    private String currency;
    private Integer itemCount;
    private LocalDateTime occurredAt;
}
