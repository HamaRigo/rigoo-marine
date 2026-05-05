package com.rigoomarine.shop.service;

import com.rigoomarine.shop.dto.*;
import com.rigoomarine.shop.entity.Cart;
import com.rigoomarine.shop.entity.CartItem;
import com.rigoomarine.shop.entity.Order;
import com.rigoomarine.shop.entity.OrderItem;
import com.rigoomarine.shop.entity.Product;
import com.rigoomarine.shop.event.OrderEventPublisher;
import com.rigoomarine.shop.repository.CartRepository;
import com.rigoomarine.shop.repository.OrderRepository;
import com.rigoomarine.shop.repository.ProductRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.persistence.OptimisticLockException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final CartService cartService;
    private final OrderEventPublisher orderEventPublisher;

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${shop.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    /**
     * Stock-validate the cart, create a PENDING_PAYMENT order with snapshot items,
     * and create a Stripe Checkout Session. Returns the hosted checkout URL.
     *
     * Throws StockConflictException (409) if any line is short on stock at checkout time —
     * frontend prompts the user to update the cart.
     */
    public CheckoutResponse checkout(String userEmail) {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new PaymentNotConfiguredException("payments not configured");
        }

        Cart cart = cartRepository.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Cart is empty"));
        if (cart.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cart is empty");
        }

        // Stock validation BEFORE creating the Stripe Session — surface 409 to the user
        // rather than refund-spamming Stripe later.
        List<StockConflictItem> conflicts = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        List<CartLine> lines = new ArrayList<>();
        for (CartItem ci : cart.getItems()) {
            Product p = productRepository.findById(ci.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found"));
            int available = p.getStockQty() == null ? 0 : p.getStockQty();
            if (p.getStatus() != Product.Status.ACTIVE || available < ci.getQuantity()) {
                conflicts.add(StockConflictItem.builder()
                        .productId(p.getId())
                        .nameEn(p.getNameEn())
                        .requested(ci.getQuantity())
                        .available(available)
                        .build());
                continue;
            }
            BigDecimal lineTotal = p.getPriceQar().multiply(BigDecimal.valueOf(ci.getQuantity()));
            subtotal = subtotal.add(lineTotal);
            lines.add(new CartLine(p, ci.getQuantity(), lineTotal));
        }
        if (!conflicts.isEmpty()) {
            throw new StockConflictException(conflicts);
        }

        // Persist the order first (without sessionId) so we have a stable orderId
        // to embed in Stripe metadata + success URL.
        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .userEmail(userEmail)
                .status(Order.Status.PENDING_PAYMENT)
                .subtotalQar(subtotal)
                .taxQar(BigDecimal.ZERO)             // Qatar VAT not enforced — locked
                .totalQar(subtotal)
                .currency("QAR")
                .build();
        for (CartLine line : lines) {
            Product p = line.product;
            OrderItem oi = OrderItem.builder()
                    .order(order)
                    .productId(p.getId())
                    .sku(p.getSku())
                    .nameEn(p.getNameEn())
                    .nameAr(p.getNameAr())
                    .priceQar(p.getPriceQar())
                    .imageUrl(firstUrl(p.getMediaUrls()))
                    .quantity(line.qty)
                    .lineTotalQar(line.lineTotal)
                    .build();
            order.getItems().add(oi);
        }
        order = orderRepository.save(order);

        // Create the Stripe Checkout Session.
        Stripe.apiKey = stripeSecretKey;
        try {
            SessionCreateParams.Builder params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(frontendBaseUrl + "/checkout/success?orderId=" + order.getId())
                    .setCancelUrl(frontendBaseUrl + "/checkout/cancel?orderId=" + order.getId())
                    .setCustomerEmail(userEmail)
                    .putMetadata("orderId", String.valueOf(order.getId()))
                    .putMetadata("orderNumber", order.getOrderNumber())
                    .putMetadata("source", "SHOP");

            for (CartLine line : lines) {
                Product p = line.product;
                long unitAmount = p.getPriceQar()
                        .setScale(2, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))      // QAR → fils
                        .longValueExact();
                params.addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity((long) line.qty)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency("qar")
                                .setUnitAmount(unitAmount)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(p.getNameEn())
                                        .setDescription(p.getSku())
                                        .build())
                                .build())
                        .build());
            }

            Session session = Session.create(params.build());
            order.setStripeSessionId(session.getId());
            orderRepository.save(order);

            return CheckoutResponse.builder()
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .checkoutUrl(session.getUrl())
                    .sessionId(session.getId())
                    .build();
        } catch (StripeException e) {
            log.error("Stripe Session.create failed for order {}: {}", order.getId(), e.getMessage());
            throw new RuntimeException("Could not create checkout session: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public OrderDTO getById(Long id, String userEmail) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!order.getUserEmail().equals(userEmail)) {
            throw new ForbiddenException("Not your order");
        }
        return toDTO(order);
    }

    @Transactional(readOnly = true)
    public Page<OrderDTO> getMyOrders(String userEmail, Pageable pageable) {
        return orderRepository.findByUserEmail(userEmail, pageable).map(this::toDTO);
    }

    /**
     * Internal — called by invoice-module's webhook handler when a SHOP checkout completes.
     * Idempotent: returns silently if the order is already PAID (handles Stripe retries).
     * Optimistically locked stock decrement retries on contention.
     */
    @Retryable(
            retryFor = OptimisticLockException.class,
            maxAttempts = 4,
            backoff = @Backoff(delay = 50, multiplier = 2.0)
    )
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markPaid(String stripeSessionId, String paymentIntentId) {
        Order order = orderRepository.findByStripeSessionId(stripeSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found for session " + stripeSessionId));
        if (order.getStatus() == Order.Status.PAID) {
            log.info("Order {} already PAID — idempotent ack", order.getOrderNumber());
            return;
        }
        if (order.getStatus() != Order.Status.PENDING_PAYMENT) {
            log.warn("Order {} in unexpected status {} — refusing to mark PAID",
                    order.getOrderNumber(), order.getStatus());
            return;
        }

        // Decrement stock atomically — @Version on Product fails fast on concurrent mutations,
        // and the @Retryable on this method catches it.
        for (OrderItem oi : order.getItems()) {
            Product p = productRepository.findById(oi.getProductId())
                    .orElseThrow(() -> new IllegalStateException("Product gone: " + oi.getProductId()));
            int available = p.getStockQty() == null ? 0 : p.getStockQty();
            if (available < oi.getQuantity()) {
                // Rare race — payment came in but stock dropped to zero between checkout
                // and webhook. Mark PAID anyway and let admin handle (refund/cancel manually).
                // Stock goes negative-prevented: cap at zero, surface in admin order detail.
                log.error("STOCK RACE on order {}: product {} requested {} available {}",
                        order.getOrderNumber(), p.getId(), oi.getQuantity(), available);
                p.setStockQty(0);
            } else {
                p.setStockQty(available - oi.getQuantity());
            }
            productRepository.save(p);
        }

        order.setStatus(Order.Status.PAID);
        order.setPaidAt(LocalDateTime.now());
        order.setStripePaymentIntentId(paymentIntentId);
        orderRepository.save(order);

        // Clear the cart now that it's converted into an order.
        cartService.clearCart(order.getUserEmail());

        log.info("Order {} marked PAID (paymentIntent={})", order.getOrderNumber(), paymentIntentId);

        // Best-effort fire-and-forget — notification-service consumes for confirmation email.
        // Failure is logged inside the publisher; we don't roll back the PAID transition on Kafka issues.
        orderEventPublisher.publishOrderPaid(order);
    }

    /**
     * Internal — called when checkout.session.expired or payment_intent.payment_failed.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCancelled(String stripeSessionId) {
        orderRepository.findByStripeSessionId(stripeSessionId).ifPresent(order -> {
            if (order.getStatus() == Order.Status.PENDING_PAYMENT) {
                order.setStatus(Order.Status.CANCELLED);
                order.setCancelledAt(LocalDateTime.now());
                orderRepository.save(order);
                log.info("Order {} marked CANCELLED", order.getOrderNumber());
                orderEventPublisher.publishOrderCancelled(order);
            }
        });
    }

    private String generateOrderNumber() {
        // RGM-YYYY-NNNNN — readable, customer-facing. Random suffix avoids needing a counter table.
        for (int attempt = 0; attempt < 8; attempt++) {
            int n = ThreadLocalRandom.current().nextInt(10_000, 100_000);
            String num = "RGM-" + Year.now().getValue() + "-" + n;
            if (!orderRepository.existsByOrderNumber(num)) return num;
        }
        // Fallback to UUID if collisions persist (won't happen at any realistic scale).
        return "RGM-" + Year.now().getValue() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
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

    private static String firstUrl(String mediaUrlsJson) {
        if (mediaUrlsJson == null || !mediaUrlsJson.startsWith("[")) return null;
        int start = mediaUrlsJson.indexOf('"');
        int end = start >= 0 ? mediaUrlsJson.indexOf('"', start + 1) : -1;
        return (start >= 0 && end > start) ? mediaUrlsJson.substring(start + 1, end) : null;
    }

    private record CartLine(Product product, int qty, BigDecimal lineTotal) {}

    public static class StockConflictException extends RuntimeException {
        private final List<StockConflictItem> conflicts;
        public StockConflictException(List<StockConflictItem> conflicts) {
            super("stock conflict");
            this.conflicts = conflicts;
        }
        public List<StockConflictItem> getConflicts() { return conflicts; }
    }

    public static class PaymentNotConfiguredException extends RuntimeException {
        public PaymentNotConfiguredException(String msg) { super(msg); }
    }

    public static class ForbiddenException extends RuntimeException {
        public ForbiddenException(String msg) { super(msg); }
    }
}
