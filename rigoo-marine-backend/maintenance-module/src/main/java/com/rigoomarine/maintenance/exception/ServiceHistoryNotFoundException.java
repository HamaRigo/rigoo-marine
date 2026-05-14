package com.rigoomarine.maintenance.exception;

public class ServiceHistoryNotFoundException extends RuntimeException {
    public ServiceHistoryNotFoundException(Long id) {
        super("Service history record " + id + " not found");
    }
}
