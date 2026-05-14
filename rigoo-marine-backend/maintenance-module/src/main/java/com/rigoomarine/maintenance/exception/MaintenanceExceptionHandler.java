package com.rigoomarine.maintenance.exception;

import com.rigoomarine.common.exceptions.CommonExceptionHandler;
import com.rigoomarine.common.exceptions.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

/**
 * Maintenance-service exception handlers. Inherits universal mappings from
 * {@link CommonExceptionHandler}; adds maintenance-specific error codes for
 * history/schedule lookups, engine-hours validation, and vessel-service
 * degradation.
 *
 * <p>Notable choices:
 * <ul>
 *   <li>{@link VesselNotOwnedException} → 404 (with code {@code VESSEL_NOT_OWNED}),
 *       mirroring vessel-service's leak-prevention policy.</li>
 *   <li>{@link VesselLookupUnavailableException} → 503 so callers can retry —
 *       the dossier endpoint already degrades to a partial payload, but write
 *       paths must surface this loudly.</li>
 *   <li>{@link ObjectOptimisticLockingFailureException} → 409 {@code CONCURRENT_MODIFICATION}
 *       so the UI can refresh and reattempt.</li>
 * </ul>
 */
@RestControllerAdvice
@Slf4j
public class MaintenanceExceptionHandler extends CommonExceptionHandler {

    @ExceptionHandler(ServiceHistoryNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleHistoryNotFound(ServiceHistoryNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error("SERVICE_HISTORY_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(ServiceScheduleNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleScheduleNotFound(ServiceScheduleNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error("SERVICE_SCHEDULE_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(InvalidEngineHoursException.class)
    public ResponseEntity<ErrorResponse> handleInvalidEngineHours(InvalidEngineHoursException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(error("INVALID_ENGINE_HOURS", ex.getMessage()));
    }

    @ExceptionHandler(VesselNotOwnedException.class)
    public ResponseEntity<ErrorResponse> handleVesselNotOwned(VesselNotOwnedException ex) {
        log.warn("vessel ownership denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error("VESSEL_NOT_OWNED", "Vessel not found"));
    }

    @ExceptionHandler(VesselLookupUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleVesselLookupUnavailable(VesselLookupUnavailableException ex) {
        log.warn("vessel-service lookup failed: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(error("VESSEL_LOOKUP_UNAVAILABLE",
                "Could not reach the vessel service; please retry shortly"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(error("VALIDATION_FAILED", ex.getMessage()));
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        log.info("optimistic-lock conflict: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(error("CONCURRENT_MODIFICATION", "Another change reached the server first — please retry"));
    }

    @Override
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, WebRequest req) {
        log.warn("Access denied: {} on {}", ex.getMessage(), req.getDescription(false));
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error("VESSEL_NOT_OWNED", "Vessel not found"));
    }
}
