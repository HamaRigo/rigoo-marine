package com.rigoomarine.shop.event;

import com.rigoomarine.shop.entity.Order;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Publishes shop order lifecycle events. Failure to publish is logged but does NOT
 * fail the surrounding transaction — the order has already been marked PAID in DB,
 * which is the durable source of truth. The email is best-effort.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventPublisher {

    public static final String TOPIC = "shop.order.status";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishOrderPaid(Order order) {
        publish("ORDER_PAID", order);
    }

    public void publishOrderCancelled(Order order) {
        publish("ORDER_CANCELLED", order);
    }

    private void publish(String type, Order order) {
        try {
            ShopOrderEvent event = ShopOrderEvent.builder()
                    .type(type)
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .userEmail(order.getUserEmail())
                    .status(order.getStatus().name())
                    .totalQar(order.getTotalQar())
                    .currency(order.getCurrency())
                    .itemCount(order.getItems() == null ? 0 : order.getItems().size())
                    .occurredAt(LocalDateTime.now())
                    .build();
            kafkaTemplate.send(TOPIC, order.getOrderNumber(), event);
            log.info("Published {} for order {}", type, order.getOrderNumber());
        } catch (Exception e) {
            log.error("Failed to publish {} for order {}: {}", type, order.getOrderNumber(), e.getMessage());
            // Swallow — DB state is authoritative; email is best-effort.
        }
    }
}
