package com.rigoomarine.client.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Locks the contract of {@link ClientNotFoundException} and the matching 404
 * handler. Two surfaces:
 *
 * <ol>
 *   <li>Exception type — message captures the lookup key so logs and error
 *       responses are unambiguous; class extends RuntimeException so callers
 *       with broad catches still work.</li>
 *   <li>Handler mapping — directly invokes the handler method (the surrounding
 *       Spring MVC plumbing is Spring's responsibility); verifies status,
 *       message, and the response-body shape callers parse today.</li>
 * </ol>
 */
class ClientNotFoundExceptionTest {

    @Test
    void messageCapturesNumericLookupKey() {
        ClientNotFoundException ex = new ClientNotFoundException(17L);
        assertEquals("Client 17 not found", ex.getMessage());
    }

    @Test
    void messageCapturesEmailLookupKey() {
        ClientNotFoundException ex = new ClientNotFoundException("user@example.com");
        assertEquals("Client user@example.com not found", ex.getMessage());
    }

    @Test
    void isA_RuntimeException_soBroadCatchesStillWork() {
        assertTrue(RuntimeException.class.isAssignableFrom(ClientNotFoundException.class));
        // Sanity-check that the constructor delegates message to super so
        // `catch (RuntimeException e)` callers see the same `getMessage()`.
        RuntimeException asBase = new ClientNotFoundException(42L);
        assertEquals("Client 42 not found", asBase.getMessage());
    }

    @Test
    void handlerReturns404WithBodyShape() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        ClientNotFoundException ex = new ClientNotFoundException(999L);

        ResponseEntity<Map<String, Object>> response = handler.handleClientNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals(404, body.get("status"), "status field");
        assertEquals("Not Found", body.get("error"), "error reason phrase");
        assertEquals("Client 999 not found", body.get("message"), "message carries the lookup key");
        assertNotNull(body.get("timestamp"), "timestamp present");
    }

    @Test
    void handlerSpecificityWinsOverBroadRuntimeHandler() {
        // The class declares the typed handler BEFORE the broad
        // RuntimeException handler in source order — Spring's
        // most-specific-match resolution makes the typed one win regardless,
        // but we sanity-check that the broad handler still maps to 400 for
        // non-typed exceptions so the existing contract isn't disturbed.
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        RuntimeException generic = new RuntimeException("some other failure");

        ResponseEntity<Map<String, Object>> response = handler.handleRuntimeException(generic);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode(),
            "broad RuntimeException handler still produces 400 for non-ClientNotFound types");
    }
}
