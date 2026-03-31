package com.rigoomarine.client.controller;

import com.rigoomarine.client.dto.ClientDTO;
import com.rigoomarine.client.dto.CreateClientRequest;
import com.rigoomarine.client.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;
    private final PasswordEncoder passwordEncoder;

    // ============== Auth Endpoints ==============

    @PostMapping("/auth/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody CreateClientRequest request) {
        ClientDTO client = clientService.createClient(request);
        Map<String, Object> response = new HashMap<>();
        response.put("user", client);
        // TODO: Generate JWT token when JWT is implemented
        response.put("token", "mock-token-" + client.getId());
        response.put("expiresAt", java.time.Instant.now().plusSeconds(3600).toString());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        try {
            ClientDTO client = clientService.getClientByEmail(email);

            // TODO: Replace with actual password verification when JWT is implemented
            // For now, accept any password (insecure - for development only)
            if (client != null) {
                Map<String, Object> response = new HashMap<>();
                response.put("user", client);
                response.put("token", "mock-token-" + client.getId());
                response.put("expiresAt", java.time.Instant.now().plusSeconds(3600).toString());
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            // Client not found
        }

        return ResponseEntity.status(401).build();
    }

    @GetMapping("/auth/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@RequestHeader("Authorization") String authHeader) {
        // Extract user ID from token (mock implementation)
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (token.startsWith("mock-token-")) {
                Long userId = Long.parseLong(token.substring("mock-token-".length()));
                ClientDTO client = clientService.getClientById(userId);
                Map<String, Object> response = new HashMap<>();
                response.put("user", client);
                return ResponseEntity.ok(response);
            }
        }
        return ResponseEntity.status(401).build();
    }

    @PutMapping("/auth/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
        @RequestHeader("Authorization") String authHeader,
        @RequestBody Map<String, String> updates
    ) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (token.startsWith("mock-token-")) {
                Long userId = Long.parseLong(token.substring("mock-token-".length()));
                ClientDTO client = clientService.getClientById(userId);

                // Create update request
                CreateClientRequest request = new CreateClientRequest();
                request.setName(updates.getOrDefault("name", client.getName()));
                request.setEmail(updates.getOrDefault("email", client.getEmail()));
                request.setPhone(updates.getOrDefault("phone", client.getPhone()));
                request.setAddress(updates.get("address"));
                request.setCompany(updates.get("company"));

                ClientDTO updated = clientService.updateClient(userId, request);
                Map<String, Object> response = new HashMap<>();
                response.put("user", updated);
                return ResponseEntity.ok(response);
            }
        }
        return ResponseEntity.status(401).build();
    }

    // ============== Client Management Endpoints ==============

    @PostMapping("/clients")
    public ResponseEntity<ClientDTO> createClient(@Valid @RequestBody CreateClientRequest request) {
        return ResponseEntity.ok(clientService.createClient(request));
    }

    @GetMapping("/clients")
    public ResponseEntity<List<ClientDTO>> getAllClients() {
        return ResponseEntity.ok(clientService.getAllClients());
    }

    @GetMapping("/clients/{id}")
    public ResponseEntity<ClientDTO> getClientById(@PathVariable Long id) {
        return ResponseEntity.ok(clientService.getClientById(id));
    }

    @GetMapping("/clients/email/{email}")
    public ResponseEntity<ClientDTO> getClientByEmail(@PathVariable String email) {
        return ResponseEntity.ok(clientService.getClientByEmail(email));
    }

    @PutMapping("/clients/{id}")
    public ResponseEntity<ClientDTO> updateClient(
        @PathVariable Long id,
        @Valid @RequestBody CreateClientRequest request
    ) {
        return ResponseEntity.ok(clientService.updateClient(id, request));
    }

    @DeleteMapping("/clients/{id}")
    public ResponseEntity<Void> deleteClient(@PathVariable Long id) {
        clientService.deleteClient(id);
        return ResponseEntity.noContent().build();
    }
}
