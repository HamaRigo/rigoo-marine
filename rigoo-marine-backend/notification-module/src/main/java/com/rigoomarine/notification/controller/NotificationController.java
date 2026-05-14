package com.rigoomarine.notification.controller;

import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.notification.dto.NotificationDTO;
import com.rigoomarine.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Notification feed for the authenticated client. All read endpoints derive
 * {@code clientId} from the JWT — the previous {@code ?clientId=} query
 * parameter is dropped to prevent identity spoofing.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code GET /api/notifications/my}             paged feed</li>
 *   <li>{@code GET /api/notifications/my/unread}      list of unread (for the dropdown)</li>
 *   <li>{@code GET /api/notifications/my/unread-count} numeric badge value</li>
 *   <li>{@code PUT /api/notifications/{id}/read}      mark one, ownership-checked</li>
 *   <li>{@code PUT /api/notifications/my/read-all}    mark every unread row for the caller</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/my")
    public ResponseEntity<Page<NotificationDTO>> getMyNotifications(Pageable pageable) {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        return ResponseEntity.ok(notificationService.getMyNotifications(clientId, pageable));
    }

    @GetMapping("/my/unread")
    public ResponseEntity<List<NotificationDTO>> getMyUnread() {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        return ResponseEntity.ok(notificationService.getMyUnread(clientId));
    }

    @GetMapping("/my/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(clientId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationDTO> markAsRead(@PathVariable Long id) {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        return ResponseEntity.ok(notificationService.markAsRead(id, clientId));
    }

    @PutMapping("/my/read-all")
    public ResponseEntity<Map<String, Integer>> markAllRead() {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        return ResponseEntity.ok(Map.of("updated", notificationService.markAllRead(clientId)));
    }
}
