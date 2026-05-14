package com.rigoomarine.maintenance.exception;

public class ServiceScheduleNotFoundException extends RuntimeException {
    public ServiceScheduleNotFoundException(Long vesselId, String type) {
        super("No schedule for vessel=" + vesselId + " type=" + type);
    }
}
