package com.rigoomarine.workorder.client;

import com.rigoomarine.workorder.exception.VesselLookupUnavailableException;
import com.rigoomarine.workorder.exception.VesselNotOwnedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class VesselOwnershipClientTest {

    private static final String TOKEN = "test-internal-token";

    private RestTemplate restTemplate;
    private MockRestServiceServer server;
    private VesselOwnershipClient client;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        server = MockRestServiceServer.createServer(restTemplate);
        client = new VesselOwnershipClient(restTemplate, TOKEN);
    }

    @Test
    void verifyAccess_passes_when204NoContent() {
        server.expect(requestTo("http://vessel-service/api/internal/vessels/17/ownership?clientId=42"))
              .andExpect(method(HttpMethod.GET))
              .andExpect(header("X-Internal-Api-Token", TOKEN))
              .andRespond(withStatus(HttpStatus.NO_CONTENT));

        assertDoesNotThrow(() -> client.verifyAccess(17L, 42L));
        server.verify();
    }

    @Test
    void verifyAccess_throwsNotOwned_on404() {
        server.expect(requestTo("http://vessel-service/api/internal/vessels/17/ownership?clientId=42"))
              .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThrows(VesselNotOwnedException.class, () -> client.verifyAccess(17L, 42L));
        server.verify();
    }

    @Test
    void verifyAccess_throwsUnavailable_on401_indicatingMisconfig() {
        server.expect(requestTo("http://vessel-service/api/internal/vessels/17/ownership?clientId=42"))
              .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThrows(VesselLookupUnavailableException.class, () -> client.verifyAccess(17L, 42L));
        server.verify();
    }

    @Test
    void verifyAccess_throwsUnavailable_on5xx() {
        server.expect(requestTo("http://vessel-service/api/internal/vessels/17/ownership?clientId=42"))
              .andRespond(withServerError());

        assertThrows(VesselLookupUnavailableException.class, () -> client.verifyAccess(17L, 42L));
        server.verify();
    }

    @Test
    void verifyAccess_throwsNotOwned_whenVesselIdIsNull() {
        assertThrows(VesselNotOwnedException.class, () -> client.verifyAccess(null, 42L));
    }

    @Test
    void verifyAccess_throwsUnavailable_whenOwnerClientIdIsNull() {
        assertThrows(VesselLookupUnavailableException.class, () -> client.verifyAccess(17L, null));
    }
}
