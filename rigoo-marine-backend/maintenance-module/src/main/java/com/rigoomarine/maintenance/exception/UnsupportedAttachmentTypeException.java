package com.rigoomarine.maintenance.exception;

public class UnsupportedAttachmentTypeException extends RuntimeException {
    public UnsupportedAttachmentTypeException(String contentType) {
        super("Attachment content-type not allowed: " + contentType);
    }
}
