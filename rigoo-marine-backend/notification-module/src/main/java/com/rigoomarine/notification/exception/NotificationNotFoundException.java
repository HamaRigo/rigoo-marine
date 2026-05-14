package com.rigoomarine.notification.exception;

public class NotificationNotFoundException extends RuntimeException {
    public NotificationNotFoundException(Long id) {
        super("Notification " + id + " not found");
    }
}
