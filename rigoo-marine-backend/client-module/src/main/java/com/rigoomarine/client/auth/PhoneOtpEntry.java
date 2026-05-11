package com.rigoomarine.client.auth;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One-time-password entry for SMS-based login. The plaintext code never lives
 * in the DB — only its SHA-256 hex hash. Single-use enforced via {@code usedAt};
 * bounded retries via {@code attempts}/{@code maxAttempts}.
 */
@Entity
@Table(name = "phone_otp_codes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhoneOtpEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(nullable = false)
    @Builder.Default
    private Integer attempts = 0;

    @Column(name = "max_attempts", nullable = false)
    @Builder.Default
    private Integer maxAttempts = 5;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(length = 8)
    private String locale;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
