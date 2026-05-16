package com.rigoomarine.client.exception;

import com.rigoomarine.common.exceptions.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

class ClientNotFoundExceptionTest {

    @Test
    void messageCapturesNumericLookupKey() {
        assertEquals("Client 17 not found", new ClientNotFoundException(17L).getMessage());
    }

    @Test
    void messageCapturesEmailLookupKey() {
        assertEquals("Client user@example.com not found",
            new ClientNotFoundException("user@example.com").getMessage());
    }

    @Test
    void isA_RuntimeException_soBroadCatchesStillWork() {
        assertTrue(RuntimeException.class.isAssignableFrom(ClientNotFoundException.class));
    }

    @Test
    void handlerReturns404WithSharedErrorResponseShape() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        ClientNotFoundException ex = new ClientNotFoundException(999L);

        ResponseEntity<ErrorResponse> response = handler.handleClientNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        ErrorResponse body = response.getBody();
        assertNotNull(body);
        assertEquals("CLIENT_NOT_FOUND", body.getErrorCode());
        assertEquals("Client 999 not found", body.getMessage());
        assertNotNull(body.getTimestamp());
        assertNull(body.getFieldErrors(), "fieldErrors only populated for VALIDATION_FAILED");
    }
}
