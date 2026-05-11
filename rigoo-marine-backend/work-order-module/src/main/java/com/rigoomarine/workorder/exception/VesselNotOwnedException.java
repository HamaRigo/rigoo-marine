package com.rigoomarine.workorder.exception;

/**
 * Thrown when a service-request body references a vesselId the caller does not own
 * (or which does not exist — the two cases collapse to the same 400 response to
 * avoid leaking vessel-existence information).
 */
public class VesselNotOwnedException extends RuntimeException {
    public VesselNotOwnedException(Long vesselId) {
        super("Vessel " + vesselId + " is not accessible to the current user");
    }
}
