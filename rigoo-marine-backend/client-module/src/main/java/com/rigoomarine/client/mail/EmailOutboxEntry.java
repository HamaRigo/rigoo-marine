package com.rigoomarine.client.mail;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Row persisted by {@link SmtpMailSender}'s {@code @Recover} path when in-process
 * retries are exhausted. Acts as a durable safety net so a transient SMTP
 * outage doesn't lose verification or password-reset emails.
 */
@Entity
@Table(name = "email_outbox")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailOutboxEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_name", length = 64)
    private String templateName;

    @Column(nullable = false, length = 320)
    private String recipient;

    @Column(nullable = false, length = 500)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "FAILED";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_attempt_at")
    private LocalDateTime lastAttemptAt;

    /** When the redriver should next attempt this row. Null for SENT/DEAD. */
    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    /** Set when status moves to RETRYING; stale claims (>5 min old) get reclaimed. */
    @Column(name = "claimed_at")
    private LocalDateTime claimedAt;

    /** Post-failure redrive attempt count (distinct from {@code retryCount} which is the initial in-process retry count). */
    @Column(name = "redrive_attempts", nullable = false)
    @Builder.Default
    private Integer redriveAttempts = 0;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (lastAttemptAt == null) lastAttemptAt = createdAt;
    }
}
