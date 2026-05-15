package com.rigoomarine.maintenance.exception;

public class AttachmentLimitReachedException extends RuntimeException {
    public AttachmentLimitReachedException(long historyId, int limit) {
        super("History " + historyId + " already has " + limit + " attachments (max).");
    }
}
