package com.rigoomarine.workorder.exception;

public class WorkOrderNotFoundException extends RuntimeException {
    public WorkOrderNotFoundException(Long id) {
        super("Work order " + id + " not found");
    }
}
