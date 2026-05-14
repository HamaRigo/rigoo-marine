package com.rigoomarine.notification.dto;

import com.rigoomarine.notification.entity.Notification;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Outbound shape for the in-app feed. Excludes server-side bookkeeping
 * (status, sentAt) that's not useful to the client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDTO {
    private Long id;
    private String type;
    private String title;
    private String message;
    private boolean read;
    private String channel;
    private LocalDateTime createdAt;

    public static NotificationDTO from(Notification n) {
        return NotificationDTO.builder()
            .id(n.getId())
            .type(n.getType())
            .title(n.getTitle())
            .message(n.getMessage())
            .read(Boolean.TRUE.equals(n.getRead()))
            .channel(n.getChannel())
            .createdAt(n.getCreatedAt())
            .build();
    }
}
