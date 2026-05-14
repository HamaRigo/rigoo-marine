package com.rigoomarine.notification.repository;

import com.rigoomarine.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByClientIdOrderByCreatedAtDesc(Long clientId);

    List<Notification> findByClientIdAndRead(Long clientId, Boolean read);

    Page<Notification> findByClientIdOrderByCreatedAtDesc(Long clientId, Pageable pageable);

    long countByClientIdAndRead(Long clientId, Boolean read);

    /**
     * Bulk mark-all-read for a client. Returns the number of rows updated so
     * the caller can give the UI an accurate "you cleared N notifications"
     * toast.
     */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.clientId = :clientId AND n.read = false")
    int markAllReadByClientId(@Param("clientId") Long clientId);
}
