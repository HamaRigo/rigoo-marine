package com.rigoomarine.common.exceptions;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.Map;

/**
 * Canonical error-response shape returned by every service that extends
 * {@link CommonExceptionHandler}. The {@code errorCode} is a stable identifier
 * the frontend can switch on; {@code message} is a human-readable companion;
 * {@code fieldErrors} is populated only for validation failures.
 */
@Value
@Builder
public class ErrorResponse {
    String errorCode;
    String message;
    Instant timestamp;
    Map<String, String> fieldErrors;
}
