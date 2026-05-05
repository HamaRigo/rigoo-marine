package com.rigoomarine.shop.controller;

import com.rigoomarine.shop.dto.CheckoutResponse;
import com.rigoomarine.shop.dto.OrderDTO;
import com.rigoomarine.shop.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * Validate cart stock, create PENDING_PAYMENT order, return Stripe Checkout URL.
     */
    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(Authentication auth) {
        return ResponseEntity.ok(orderService.checkout(auth.getName()));
    }

    @GetMapping("/my")
    public ResponseEntity<Page<OrderDTO>> myOrders(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(orderService.getMyOrders(auth.getName(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderDTO> getById(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(orderService.getById(id, auth.getName()));
    }
}
