package com.rigoomarine.client.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "clients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private UserRole role;

    private String address;

    private String company;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Task #6: email verification + password reset
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified;

    @Column(name = "email_verification_token_hash", length = 64)
    private String emailVerificationTokenHash;

    @Column(name = "email_verification_expires_at")
    private LocalDateTime emailVerificationExpiresAt;

    @Column(name = "password_changed_at")
    private LocalDateTime passwordChangedAt;

    /**
     * BCP-47 language tag (currently only "en" or "ar"). Drives outbound email
     * locale resolution in notification-module's EmailTemplateService — falls
     * back to 'en' when null so legacy rows behave as they did before this
     * column existed.
     */
    @Column(name = "preferred_language", length = 5, nullable = false)
    private String preferredLanguage;

    /**
     * Opaque per-user secret carried in every outbound email's unsubscribe
     * URL. Rotated by the operator to invalidate any in-the-wild links
     * (key-leak playbook). Generated automatically on insert via
     * {@link #onCreate()} if not provided.
     */
    @Column(name = "unsubscribe_token", length = 64, nullable = false, unique = true)
    private String unsubscribeToken;

    /**
     * Soft opt-out flag honoured by notification-module's EmailTemplateService
     * before any send. In-app notifications continue to fire even when this
     * is TRUE — users still see the bell badge; they just don't get emails.
     */
    @Column(name = "notifications_paused", nullable = false)
    private Boolean notificationsPaused;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (emailVerified == null) emailVerified = Boolean.FALSE;
        if (passwordChangedAt == null) passwordChangedAt = createdAt;
        if (preferredLanguage == null) preferredLanguage = "en";
        if (unsubscribeToken == null) unsubscribeToken = java.util.UUID.randomUUID().toString();
        if (notificationsPaused == null) notificationsPaused = Boolean.FALSE;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum UserRole {
        CLIENT,
        ADMIN,
        TECHNICIAN
    }
}
