package com.rigoomarine.vessel.exception;

import com.rigoomarine.common.exceptions.CommonExceptionHandler;
import com.rigoomarine.common.exceptions.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

/**
 * Vessel-service exception handlers. Inherits the universal mappings
 * (validation, auth, illegal-state, catch-all) from {@link CommonExceptionHandler};
 * overrides {@link #handleAccessDenied} to return a vessel-specific
 * {@code errorCode} on the leak-prevention 404.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler extends CommonExceptionHandler {

    @ExceptionHandler(VesselNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(VesselNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("VESSEL_NOT_FOUND", ex.getMessage()));
    }

    /**
     * Non-owners hitting an owner-scoped endpoint collapse to 404 with the
     * vessel-specific code (parent default would return RESOURCE_NOT_FOUND).
     */
    @Override
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, WebRequest req) {
        log.warn("Access denied: {} on {}", ex.getMessage(), req.getDescription(false));
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("VESSEL_NOT_FOUND", "Vessel not found"));
    }
}
