package com.rigoomarine.shop.service;

import com.rigoomarine.shop.dto.OrderDTO;
import com.rigoomarine.shop.dto.OrderItemDTO;
import com.rigoomarine.shop.entity.Order;
import com.rigoomarine.shop.entity.OrderItem;
import com.rigoomarine.shop.repository.OrderRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminOrderService {

    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public Page<OrderDTO> search(String status, String q, Pageable pageable) {
        Specification<Order> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("status"), Order.Status.valueOf(status)));
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("orderNumber")), like),
                        cb.like(cb.lower(root.get("userEmail")), like)
                ));
            }
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return orderRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public OrderDTO getById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        return toDTO(order);
    }

    /**
     * Manual admin status override — used rarely for stuck orders (e.g. Stripe webhook never fired,
     * customer paid via offline channel, refund issued out-of-band).
     *
     * Does NOT decrement/restock inventory. Refund-and-restock flow is Phase 3.
     */
    public OrderDTO updateStatus(Long id, String newStatus) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        Order.Status target;
        try {
            target = Order.Status.valueOf(newStatus);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid status: " + newStatus);
        }
        order.setStatus(target);
        if (target == Order.Status.PAID && order.getPaidAt() == null) {
            order.setPaidAt(LocalDateTime.now());
        } else if (target == Order.Status.CANCELLED && order.getCancelledAt() == null) {
            order.setCancelledAt(LocalDateTime.now());
        }
        return toDTO(orderRepository.save(order));
    }

    private OrderDTO toDTO(Order o) {
        List<OrderItemDTO> items = new ArrayList<>();
        for (OrderItem oi : o.getItems()) {
            items.add(OrderItemDTO.builder()
                    .id(oi.getId())
                    .productId(oi.getProductId())
                    .sku(oi.getSku())
                    .nameEn(oi.getNameEn())
                    .nameAr(oi.getNameAr())
                    .priceQar(oi.getPriceQar())
                    .imageUrl(oi.getImageUrl())
                    .quantity(oi.getQuantity())
                    .lineTotalQar(oi.getLineTotalQar())
                    .build());
        }
        return OrderDTO.builder()
                .id(o.getId())
                .orderNumber(o.getOrderNumber())
                .userEmail(o.getUserEmail())
                .status(o.getStatus().name())
                .subtotalQar(o.getSubtotalQar())
                .taxQar(o.getTaxQar())
                .totalQar(o.getTotalQar())
                .currency(o.getCurrency())
                .stripeSessionId(o.getStripeSessionId())
                .notes(o.getNotes())
                .items(items)
                .paidAt(o.getPaidAt())
                .cancelledAt(o.getCancelledAt())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }
}
