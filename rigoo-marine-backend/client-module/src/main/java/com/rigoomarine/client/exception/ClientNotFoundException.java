package com.rigoomarine.client.exception;

/**
 * Thrown by {@code ClientService} read paths when the requested client doesn't
 * exist. Mapped to 404 by {@code GlobalExceptionHandler} so callers (admin
 * dashboard, login flow, CI smoke tests) can distinguish "no such resource"
 * from "your request was malformed".
 *
 * <p>Constructors accept either a numeric id or an email — the lookup key
 * captured in the message is what surfaces to operators in logs and error
 * responses, so it's worth keeping precise at the throw site.
 */
public class ClientNotFoundException extends RuntimeException {

    public ClientNotFoundException(Long id) {
        super("Client " + id + " not found");
    }

    public ClientNotFoundException(String email) {
        super("Client " + email + " not found");
    }
}
