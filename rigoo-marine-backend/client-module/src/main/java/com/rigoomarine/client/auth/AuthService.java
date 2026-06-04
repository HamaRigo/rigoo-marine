package com.rigoomarine.client.auth;

import com.rigoomarine.client.entity.Client;
import com.rigoomarine.client.mail.EmailTemplateService;
import com.rigoomarine.client.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Task #6: orchestrates email verification + password reset.
 *
 * Token strategy: short-lived (15 min reset, 24 h verify), single-use, hashed at rest.
 * On password change, password_changed_at is bumped — JwtAuthenticationFilter rejects
 * any JWT issued before that timestamp, invalidating active sessions.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    static final Duration VERIFY_TTL = Duration.ofHours(24);
    static final Duration RESET_TTL = Duration.ofMinutes(15);

    private final ClientRepository clientRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final TokenService tokenService;
    private final EmailTemplateService emailTemplateService;
    private final PasswordEncoder passwordEncoder;
    private final CacheManager cacheManager;

    @Value("${app.public-base-url:http://localhost:5173}")
    private String publicBaseUrl;

    /**
     * Issue a verification token for the given client and email it.
     * Called from registration; can be re-called via /resend-verification.
     */
    // Evict only the one client whose verification state changed.
    @CacheEvict(value = "clients", key = "#email")
    public void issueVerificationToken(String email, String locale) {
        clientRepository.findByEmail(email).ifPresent(client -> {
            if (Boolean.TRUE.equals(client.getEmailVerified())) return;
            String raw = tokenService.generate();
            client.setEmailVerificationTokenHash(tokenService.hash(raw));
            client.setEmailVerificationExpiresAt(LocalDateTime.now().plus(VERIFY_TTL));
            clientRepository.save(client);

            String link = publicBaseUrl + "/verify-email?token=" + URLEncoder.encode(raw, StandardCharsets.UTF_8);
            emailTemplateService.send("EMAIL_VERIFY", client.getEmail(), locale,
                    Map.of("name", client.getName() == null ? "" : client.getName(), "link", link));
        });
    }

    public boolean verifyEmail(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return false;
        String hash = tokenService.hash(rawToken);
        return clientRepository.findByEmailVerificationTokenHash(hash)
                .map(c -> {
                    if (Boolean.TRUE.equals(c.getEmailVerified())) return true;
                    if (c.getEmailVerificationExpiresAt() == null
                            || c.getEmailVerificationExpiresAt().isBefore(LocalDateTime.now())) {
                        return false;
                    }
                    c.setEmailVerified(true);
                    c.setEmailVerificationTokenHash(null);
                    c.setEmailVerificationExpiresAt(null);
                    clientRepository.save(c);
                    evictClient(c.getEmail(), c.getId());
                    return true;
                })
                .orElse(false);
    }

    /**
     * Always returns silently — caller responds with a generic success message
     * regardless of whether the email exists, to prevent user enumeration.
     */
    public void requestPasswordReset(String email, String locale) {
        if (email == null || email.isBlank()) return;
        clientRepository.findByEmail(email).ifPresent(client -> {
            LocalDateTime now = LocalDateTime.now();
            resetTokenRepository.invalidateActiveForClient(client.getId(), now);

            String raw = tokenService.generate();
            PasswordResetToken token = PasswordResetToken.builder()
                    .clientId(client.getId())
                    .tokenHash(tokenService.hash(raw))
                    .expiresAt(now.plus(RESET_TTL))
                    .build();
            resetTokenRepository.save(token);

            String link = publicBaseUrl + "/reset-password?token=" + URLEncoder.encode(raw, StandardCharsets.UTF_8);
            emailTemplateService.send("PASSWORD_RESET", client.getEmail(), locale,
                    Map.of("name", client.getName() == null ? "" : client.getName(), "link", link));
        });
    }

    public boolean resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank() || newPassword == null || newPassword.length() < 8) return false;
        String hash = tokenService.hash(rawToken);
        return resetTokenRepository.findByTokenHash(hash)
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(t -> {
                    Client client = clientRepository.findById(t.getClientId()).orElseThrow();
                    LocalDateTime now = LocalDateTime.now();
                    client.setPassword(passwordEncoder.encode(newPassword));
                    client.setPasswordChangedAt(now);
                    clientRepository.save(client);
                    t.setUsedAt(now);
                    resetTokenRepository.save(t);
                    evictClient(client.getEmail(), client.getId());
                    return true;
                })
                .orElse(false);
    }

    private void evictClient(String email, Long id) {
        Cache cache = cacheManager.getCache("clients");
        if (cache == null) return;
        if (email != null) cache.evict(email);
        if (id != null) cache.evict(id);
    }
}
