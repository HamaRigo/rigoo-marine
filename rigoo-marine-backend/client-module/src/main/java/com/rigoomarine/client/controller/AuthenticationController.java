package com.rigoomarine.client.controller;

import com.rigoomarine.client.dto.ClientDTO;
import com.rigoomarine.client.dto.CreateClientRequest;
import com.rigoomarine.client.security.JwtTokenProvider;
import com.rigoomarine.client.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final ClientService clientService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    /**
     * Register a new user
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody CreateClientRequest request) {
        log.info("Registering new user with email: {}", request.getEmail());

        ClientDTO client = clientService.createClient(request);
        String token = jwtTokenProvider.generateToken(client.getEmail(), client.getRole());

        Map<String, Object> response = new HashMap<>();
        response.put("user", client);
        response.put("token", token);
        response.put("expiresAt", Instant.now().plusSeconds(3600).toString());

        return ResponseEntity.ok(response);
    }

    /**
     * Login with email and password
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, String> credentials,
            @RequestParam(required = false) String role
    ) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        log.info("Login attempt for email: {}", email);

        try {
            // Authenticate user
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );

            // Load client to get role and generate token
            ClientDTO client = clientService.getClientByEmail(email);
            String token = jwtTokenProvider.generateToken(client.getEmail(), client.getRole());

            Map<String, Object> response = new HashMap<>();
            response.put("user", client);
            response.put("token", token);
            response.put("expiresAt", Instant.now().plusSeconds(3600).toString());

            return ResponseEntity.ok(response);

        } catch (BadCredentialsException e) {
            log.warn("Bad credentials for email: {}", email);
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Invalid email or password"));
        } catch (Exception e) {
            log.error("Login failed for email: {}: {}", email, e.getMessage());
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Authentication failed"));
        }
    }

    /**
     * Get current authenticated user profile
     */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(
            @AuthenticationPrincipal User userDetails
    ) {
        if (userDetails != null) {
            ClientDTO client = clientService.getClientByEmail(userDetails.getUsername());
            Map<String, Object> response = new HashMap<>();
            response.put("user", client);
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(401).build();
    }

    /**
     * Update current authenticated user profile
     */
    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @AuthenticationPrincipal User userDetails,
            @RequestBody Map<String, String> updates
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        ClientDTO client = clientService.getClientByEmail(userDetails.getUsername());

        CreateClientRequest request = new CreateClientRequest();
        request.setName(updates.getOrDefault("name", client.getName()));
        request.setEmail(updates.getOrDefault("email", client.getEmail()));
        request.setPhone(updates.getOrDefault("phone", client.getPhone()));
        request.setAddress(updates.get("address"));
        request.setCompany(updates.get("company"));

        ClientDTO updated = clientService.updateClient(client.getId(), request);
        Map<String, Object> response = new HashMap<>();
        response.put("user", updated);
        return ResponseEntity.ok(response);
    }

    /**
     * Update password for current authenticated user
     */
    @PutMapping("/password")
    public ResponseEntity<Map<String, String>> updatePassword(
            @AuthenticationPrincipal User userDetails,
            @RequestBody Map<String, String> passwordData
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        String currentPassword = passwordData.get("currentPassword");
        String newPassword = passwordData.get("newPassword");

        if (currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Current password and new password are required"));
        }

        try {
            // Verify current password
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(userDetails.getUsername(), currentPassword)
            );

            // Update password
            ClientDTO client = clientService.getClientByEmail(userDetails.getUsername());
            CreateClientRequest request = new CreateClientRequest();
            request.setName(client.getName());
            request.setEmail(client.getEmail());
            request.setPhone(client.getPhone());
            request.setAddress(client.getAddress());
            request.setCompany(client.getCompany());
            request.setPassword(passwordEncoder.encode(newPassword));

            clientService.updateClientWithPassword(client.getId(), request);

            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Current password is incorrect"));
        }
    }

    /**
     * Logout endpoint (for JWT, this is more of a client-side token removal)
     * Can be extended with token blacklist if needed
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        log.info("Logout request received");
        // For JWT stateless auth, logout is primarily client-side (token removal)
        // Future: Add token to blacklist with Redis
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    /**
     * Request password reset - sends reset email
     * TODO: Implement email sending with ResetTokenRepository
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @RequestBody Map<String, String> request
    ) {
        String email = request.get("email");
        log.info("Password reset requested for email: {}", email);

        // TODO: Generate reset token and send email
        // For now, return success to prevent email enumeration
        return ResponseEntity.ok(Map.of(
                "message", "If an account exists with that email, a password reset link has been sent"
        ));
    }

    /**
     * Reset password with token
     * TODO: Implement with ResetTokenRepository
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestBody Map<String, String> request
    ) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        log.info("Password reset with token attempted");

        // TODO: Validate token and update password
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }
}
