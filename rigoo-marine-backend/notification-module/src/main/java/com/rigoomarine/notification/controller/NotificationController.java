package com.rigoomarine.notification.controller;

import com.rigoomarine.notification.entity.Notification;
import com.rigoomarine.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/my")
    public ResponseEntity<List<Notification>> getMyNotifications(@RequestParam Long clientId) {
        return ResponseEntity.ok(notificationService.getNotificationsByClientId(clientId));
    }

    @GetMapping("/my/unread")
    public ResponseEntity<List<Notification>> getMyUnreadNotifications(@RequestParam Long clientId) {
        return ResponseEntity.ok(notificationService.getUnreadNotifications(clientId));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }
}
