package com.rigoomarine.workorder.exception;

/**
 * Thrown when work-order-service cannot reach vessel-service to verify ownership.
 * Maps to 503 — submits are blocked rather than allowed through (fail-closed),
 * because permitting on outage opens an authorization bypass.
 */
public class VesselLookupUnavailableException extends RuntimeException {
    public VesselLookupUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
