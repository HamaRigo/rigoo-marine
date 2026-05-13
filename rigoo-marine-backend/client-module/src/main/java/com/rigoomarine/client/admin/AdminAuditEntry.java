package com.rigoomarine.client.admin;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One row per sensitive admin write. Append-only: no setter on {@code createdAt}
 * after persist, no update path in the repository. The reader is the ops
 * dashboard; the writer is {@link AdminAuditService}.
 */
@Entity
@Table(name = "admin_audit")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_email", nullable = false, length = 320)
    private String actorEmail;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(nullable = false, length = 64)
    private String action;

    @Column(name = "target_type", nullable = false, length = 32)
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
