package com.rigoomarine.client.controller;

import com.rigoomarine.client.auth.AuthService;
import com.rigoomarine.client.auth.PhoneNumberService;
import com.rigoomarine.client.dto.ClientDTO;
import com.rigoomarine.client.dto.CreateClientRequest;
import com.rigoomarine.client.security.JwtTokenProvider;
import com.rigoomarine.client.security.TokenRevocationService;
import com.rigoomarine.client.service.ClientService;
import io.jsonwebtoken.Claims;
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
    private final AuthService authService;
    private final PhoneNumberService phoneNumberService;
    private final TokenRevocationService tokenRevocationService;

    /**
     * Register a new user
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @Valid @RequestBody CreateClientRequest request,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage
    ) {
        log.info("Registering new user with email: {}", request.getEmail());

        ClientDTO client = clientService.createClient(request);
        authService.issueVerificationToken(client.getEmail(), preferredLocale(acceptLanguage));

        String token = jwtTokenProvider.generateToken(client.getEmail(), client.getRole(),
                client.getPasswordChangedAt() != null
                    ? client.getPasswordChangedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
                    : null,
                client.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("user", client);
        response.put("token", token);
        response.put("expiresAt", Instant.now().plusSeconds(3600).toString());

        return ResponseEntity.ok(response);
    }

    private String preferredLocale(String acceptLanguage) {
        if (acceptLanguage == null) return "en";
        String first = acceptLanguage.split(",")[0].trim().toLowerCase();
        return first.startsWith("ar") ? "ar" : "en";
    }

    /**
     * Login by phone (preferred) or email + password.
     * Body accepts either {phone, password} or {email, password}.
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, String> credentials,
            @RequestParam(required = false) String role
    ) {
        String email = credentials.get("email");
        String phone = credentials.get("phone");
        String password = credentials.get("password");

        // Resolve to email (the AuthenticationManager + UserDetails are still email-keyed).
        String resolvedEmail = email;
        if ((resolvedEmail == null || resolvedEmail.isBlank()) && phone != null && !phone.isBlank()) {
            try {
                String normalized = phoneNumberService.normalize(phone);
                resolvedEmail = clientService.findEmailByPhone(normalized).orElse(null);
            } catch (IllegalArgumentException ex) {
                log.warn("Invalid phone format on login: {}", phone);
                return ResponseEntity.status(401).body(Map.of("error", "Invalid phone or password"));
            }
        }

        log.info("Login attempt (email-resolved): {}", resolvedEmail);
        if (resolvedEmail == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(resolvedEmail, password)
            );

            ClientDTO client = clientService.getClientByEmail(resolvedEmail);
            String token = jwtTokenProvider.generateToken(client.getEmail(), client.getRole(),
                client.getPasswordChangedAt() != null
                    ? client.getPasswordChangedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
                    : null,
                client.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("user", client);
            response.put("token", token);
            response.put("expiresAt", Instant.now().plusSeconds(3600).toString());

            return ResponseEntity.ok(response);

        } catch (BadCredentialsException e) {
            log.warn("Bad credentials for: {}", resolvedEmail);
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Invalid credentials"));
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

            // Update password. Pass the RAW newPassword: ClientService.updateClientWithPassword
            // is the sole encoder. Encoding here in addition would persist bcrypt(bcrypt(p)),
            // which the login authenticator can never match — locking the user out.
            ClientDTO client = clientService.getClientByEmail(userDetails.getUsername());
            CreateClientRequest request = new CreateClientRequest();
            request.setName(client.getName());
            request.setEmail(client.getEmail());
            request.setPhone(client.getPhone());
            request.setAddress(client.getAddress());
            request.setCompany(client.getCompany());
            request.setPassword(newPassword);

            clientService.updateClientWithPassword(client.getId(), request);

            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Current password is incorrect"));
        }
    }

    /**
     * Server-side logout: writes the bearer token's jti to the Redis revocation
     * list with TTL = remaining token lifetime. The api-gateway short-circuits
     * any subsequent request bearing this jti.
     *
     * <p>Idempotent: missing / malformed / already-expired tokens all return 200
     * with no Redis write — there's nothing for the caller to do differently.
     * Redis write failures surface as 500 so the frontend retries before
     * clearing local state.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        String token = extractBearer(authHeader);
        if (token == null) {
            return ResponseEntity.ok(Map.of("message", "Logged out"));
        }
        try {
            if (!jwtTokenProvider.validateToken(token)) {
                return ResponseEntity.ok(Map.of("message", "Logged out"));
            }
            Claims claims = jwtTokenProvider.getClaims(token);
            String jti = claims.getId();
            java.util.Date exp = claims.getExpiration();
            String subject = claims.getSubject();
            if (jti != null && exp != null) {
                tokenRevocationService.revoke(jti, exp.toInstant(), subject);
            }
            return ResponseEntity.ok(Map.of("message", "Logged out"));
        } catch (RuntimeException ex) {
            log.error("logout.failed", ex);
            return ResponseEntity.status(500).body(Map.of(
                "errorCode", "LOGOUT_FAILED",
                "message", "Could not revoke token; please retry"
            ));
        }
    }

    private static String extractBearer(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7).trim();
        return token.isEmpty() ? null : token;
    }

    /**
     * Request password reset - issues a 15-min token and emails it.
     * Generic success regardless of email existence (prevents user enumeration).
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage
    ) {
        String email = request.get("email");
        log.info("Password reset requested for email: {}", email);
        authService.requestPasswordReset(email, preferredLocale(acceptLanguage));
        return ResponseEntity.ok(Map.of(
                "message", "If an account exists with that email, a password reset link has been sent"
        ));
    }

    /**
     * Reset password with token issued by /forgot-password.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestBody Map<String, String> request
    ) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");
        boolean ok = authService.resetPassword(token, newPassword);
        if (!ok) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Reset link is invalid, expired, or already used"));
        }
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    /**
     * Verify email address with the token from the verification email.
     */
    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@RequestBody Map<String, String> request) {
        boolean ok = authService.verifyEmail(request.get("token"));
        if (!ok) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Verification link is invalid or expired"));
        }
        return ResponseEntity.ok(Map.of("message", "Email verified"));
    }

    /**
     * Re-issue a verification email for the currently authenticated user.
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(
            @AuthenticationPrincipal User userDetails,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage
    ) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        authService.issueVerificationToken(userDetails.getUsername(), preferredLocale(acceptLanguage));
        return ResponseEntity.ok(Map.of("message", "Verification email sent"));
    }
}
