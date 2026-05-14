package com.rigoomarine.notification.exception;

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
 * Inherits the universal mappings from {@link CommonExceptionHandler}. The
 * only thing we override is the leak-prevention 404 — non-owners hitting
 * mark-read on someone else's notification id get the same response as if
 * the id didn't exist.
 */
@RestControllerAdvice
@Slf4j
public class NotificationExceptionHandler extends CommonExceptionHandler {

    @ExceptionHandler(NotificationNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotificationNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error("NOTIFICATION_NOT_FOUND", ex.getMessage()));
    }

    @Override
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, WebRequest req) {
        log.warn("Access denied: {} on {}", ex.getMessage(), req.getDescription(false));
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error("NOTIFICATION_NOT_FOUND", "Notification not found"));
    }
}
