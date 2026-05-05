package com.rigoomarine.shop.controller;

import com.rigoomarine.shop.dto.AddToCartRequest;
import com.rigoomarine.shop.dto.CartDTO;
import com.rigoomarine.shop.dto.UpdateCartItemRequest;
import com.rigoomarine.shop.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<CartDTO> getCart(Authentication auth) {
        return ResponseEntity.ok(cartService.getCart(auth.getName()));
    }

    @PostMapping("/items")
    public ResponseEntity<CartDTO> addItem(
            @Valid @RequestBody AddToCartRequest req,
            Authentication auth
    ) {
        return ResponseEntity.ok(cartService.addItem(auth.getName(), req.getProductId(), req.getQuantity()));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<CartDTO> updateItem(
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest req,
            Authentication auth
    ) {
        return ResponseEntity.ok(cartService.updateItem(auth.getName(), itemId, req.getQuantity()));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<CartDTO> removeItem(
            @PathVariable Long itemId,
            Authentication auth
    ) {
        return ResponseEntity.ok(cartService.removeItem(auth.getName(), itemId));
    }

    @DeleteMapping
    public ResponseEntity<Void> clear(Authentication auth) {
        cartService.clearCart(auth.getName());
        return ResponseEntity.noContent().build();
    }
}
