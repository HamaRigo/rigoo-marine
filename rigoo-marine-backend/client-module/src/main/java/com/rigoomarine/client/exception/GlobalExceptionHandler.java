package com.rigoomarine.client.exception;

import com.rigoomarine.common.exceptions.CommonExceptionHandler;
import com.rigoomarine.common.exceptions.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

/**
 * Client-service exception handlers. Inherits universal mappings (auth,
 * illegal-state, validation, catch-all) from {@link CommonExceptionHandler}.
 *
 * <p>Overrides:
 * <ul>
 *   <li>{@code ClientNotFoundException} → 404 with the client-specific code.</li>
 *   <li>{@code BadCredentialsException} → 401 {@code INVALID_CREDENTIALS}
 *       (more specific than the inherited {@code UNAUTHENTICATED}).</li>
 *   <li>{@code AccessDeniedException} → 403 — the parent collapses to 404 for
 *       leak prevention, which is wrong for client-service auth-flow endpoints
 *       where the caller has a legitimate need to distinguish "forbidden"
 *       from "not found".</li>
 *   <li>{@code IllegalArgumentException} → 400 {@code INVALID_REQUEST}.</li>
 * </ul>
 *
 * <p>Wire-format change vs. the previous {@code Map<String,Object>} shape: the
 * response now uses {@link ErrorResponse} ({@code errorCode}, {@code message},
 * {@code timestamp}, {@code fieldErrors}). Frontend callsites that previously
 * read the {@code error} reason-phrase field have been updated to read
 * {@code message}.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends CommonExceptionHandler {

    @ExceptionHandler(ClientNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleClientNotFound(ClientNotFoundException ex) {
        log.warn("Client not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error("CLIENT_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        log.warn("Bad credentials: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(error("INVALID_CREDENTIALS", "Invalid email or password"));
    }

    /**
     * Override the parent's leak-prevention 404. For client-service auth + admin
     * endpoints, 403 is the correct semantic; the frontend's axios interceptor
     * distinguishes 403 (redirect to login) from 404 (toast).
     */
    @Override
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, WebRequest req) {
        log.warn("Access denied: {} on {}", ex.getMessage(), req.getDescription(false));
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(error("FORBIDDEN", "Access denied"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(error("INVALID_REQUEST", ex.getMessage()));
    }
}
