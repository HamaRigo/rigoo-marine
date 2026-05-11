package com.rigoomarine.workorder.exception;

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
 * Work-order-service exception handlers. Inherits the universal mappings
 * from {@link CommonExceptionHandler}; adds work-order-specific exceptions
 * (NotFound, VesselNotOwned, VesselLookupUnavailable) and overrides
 * {@link #handleAccessDenied} for the leak-prevention 404.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler extends CommonExceptionHandler {

    @ExceptionHandler(WorkOrderNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(WorkOrderNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("WORK_ORDER_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(VesselNotOwnedException.class)
    public ResponseEntity<ErrorResponse> handleVesselNotOwned(VesselNotOwnedException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error("VESSEL_NOT_OWNED", ex.getMessage()));
    }

    @ExceptionHandler(VesselLookupUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleVesselLookupUnavailable(VesselLookupUnavailableException ex) {
        log.warn("vessel-service ownership lookup failed: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error(
            "VESSEL_LOOKUP_UNAVAILABLE",
            "Could not verify vessel ownership; please retry shortly"));
    }

    /**
     * Non-owners hitting an owner-scoped endpoint collapse to 404 with the
     * work-order-specific code (parent default would return RESOURCE_NOT_FOUND).
     */
    @Override
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, WebRequest req) {
        log.warn("Access denied: {} on {}", ex.getMessage(), req.getDescription(false));
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("WORK_ORDER_NOT_FOUND", "Work order not found"));
    }
}
