package com.rigoomarine.common.exceptions;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Reusable {@code @ExceptionHandler} baseline. Not annotated with
 * {@code @RestControllerAdvice} — each service annotates its own subclass and
 * inherits the handlers below. Inheritance (over composition or a second
 * {@code @RestControllerAdvice} bean) avoids handler-ordering ambiguity and
 * gives services pure-Java {@code @Override} semantics for customization.
 *
 * <p>Each service is expected to:
 * <ul>
 *   <li>Subclass this with {@code @RestControllerAdvice}.</li>
 *   <li>Add {@code @ExceptionHandler} methods for service-specific exceptions
 *       (e.g. {@code VesselNotFoundException} → 404 with a service-specific
 *       {@code errorCode}).</li>
 *   <li>Override {@link #handleAccessDenied} if it needs a resource-specific
 *       {@code errorCode} (default returns {@code RESOURCE_NOT_FOUND}). The
 *       404 collapse is the recommended leak-prevention policy.</li>
 * </ul>
 */
@Slf4j
public class CommonExceptionHandler {

    /**
     * Default {@link AccessDeniedException} mapping: collapse to 404 to avoid
     * leaking the existence of resources the caller doesn't own. Services
     * SHOULD override to use a resource-specific {@code errorCode}.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, WebRequest req) {
        log.warn("Access denied: {} on {}", ex.getMessage(), req.getDescription(false));
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error("RESOURCE_NOT_FOUND", "Resource not found"));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleUnauthenticated(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(error("UNAUTHENTICATED", ex.getMessage()));
    }

    /**
     * Distinguishes the conventional {@code SESSION_RESTART_REQUIRED} marker
     * (thrown by SecurityUtils when a legacy token lacks the clientId claim)
     * from any other illegal-state violation.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        if ("SESSION_RESTART_REQUIRED".equals(ex.getMessage())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(error("SESSION_RESTART_REQUIRED", "Please sign out and sign in again"));
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(error("INVALID_STATE", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(fe -> fields.put(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.badRequest().body(ErrorResponse.builder()
            .errorCode("VALIDATION_FAILED")
            .message("Request validation failed")
            .timestamp(Instant.now())
            .fieldErrors(fields)
            .build());
    }

    /**
     * Spring MVC 6 throws this (not 404 status-exception) when no handler
     * matches. Without an explicit handler, the catch-all below turns it into
     * 500 — which is wrong and triggers downstream retries. Map it to 404.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error("NOT_FOUND", "Resource not found"));
    }

    /**
     * Catch-all. Stack trace logged, never returned. Subclasses should NOT
     * override unless they have a strong reason — let unknown faults degrade
     * to a generic 500 so callers see consistent shape.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(error("INTERNAL_ERROR", "An unexpected error occurred"));
    }

    /**
     * Helper for subclass handlers that want to build the same response shape.
     * Visible to subclasses; not part of the public API of this class.
     */
    protected ErrorResponse error(String code, String message) {
        return ErrorResponse.builder()
            .errorCode(code)
            .message(message)
            .timestamp(Instant.now())
            .build();
    }
}
