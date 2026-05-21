package com.rigoomarine.vessel.entity;

public enum VesselStatus {
    /** Fully operational, in regular service. */
    ACTIVE,
    /** Temporarily out of service for maintenance or repair. */
    MAINTENANCE,
    /** Stored / hauled out for an extended period. */
    LAID_UP,
    /** Vessel has been sold and is no longer owned by the client. */
    SOLD
}
