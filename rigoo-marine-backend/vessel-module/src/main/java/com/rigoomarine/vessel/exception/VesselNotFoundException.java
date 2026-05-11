package com.rigoomarine.vessel.exception;

public class VesselNotFoundException extends RuntimeException {
    public VesselNotFoundException(Long id) {
        super("Vessel " + id + " not found");
    }
}
