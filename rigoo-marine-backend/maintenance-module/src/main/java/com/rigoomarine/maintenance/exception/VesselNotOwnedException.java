package com.rigoomarine.maintenance.exception;

/**
 * Thrown when a maintenance request targets a vesselId the caller does not own
 * (or which does not exist — collapsed to one error code to avoid leaking
 * vessel-existence information).
 */
public class VesselNotOwnedException extends RuntimeException {
    public VesselNotOwnedException(Long vesselId) {
        super("Vessel " + vesselId + " is not accessible to the current user");
    }
}
