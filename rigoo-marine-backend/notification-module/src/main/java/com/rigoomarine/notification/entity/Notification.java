package com.rigoomarine.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clientId;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private NotificationStatus status;

    private String channel;

    /**
     * Optional deep-link URL surfaced as a "Book now" / "Open" button on the
     * in-app row. NULL for informational notifications. See V4 migration.
     */
    @Column(name = "action_url", length = 500)
    private String actionUrl;

    private Boolean read = false;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        status = NotificationStatus.PENDING;
    }

    public enum NotificationStatus {
        PENDING,
        SENT,
        DELIVERED,
        FAILED
    }
}
