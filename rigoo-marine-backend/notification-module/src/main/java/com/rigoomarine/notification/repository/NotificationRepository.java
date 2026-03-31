package com.rigoomarine.notification.repository;

import com.rigoomarine.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByClientIdOrderByCreatedAtDesc(Long clientId);
    List<Notification> findByClientIdAndRead(Long clientId, Boolean read);
}
