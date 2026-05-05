package com.rigoomarine.shop.exception;

import com.rigoomarine.shop.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ShopExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "Bad request"));
    }

    /** 409 — cart contains items that are out of stock or below requested qty at checkout time. */
    @ExceptionHandler(OrderService.StockConflictException.class)
    public ResponseEntity<Map<String, Object>> handleStockConflict(OrderService.StockConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "stock conflict", "conflicts", ex.getConflicts()));
    }

    /** 503 — Stripe creds not provisioned; checkout cannot proceed. */
    @ExceptionHandler(OrderService.PaymentNotConfiguredException.class)
    public ResponseEntity<Map<String, String>> handlePaymentNotConfigured(OrderService.PaymentNotConfiguredException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "payments not configured"));
    }

    /** 403 — order ownership check failed. */
    @ExceptionHandler(OrderService.ForbiddenException.class)
    public ResponseEntity<Map<String, String>> handleForbidden(OrderService.ForbiddenException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "Forbidden"));
    }
}
