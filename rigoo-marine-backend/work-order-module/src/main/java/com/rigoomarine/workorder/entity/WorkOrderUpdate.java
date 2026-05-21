package com.rigoomarine.workorder.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_order_updates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_order_id", nullable = false)
    private Long workOrderId;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Column(name = "author_role", nullable = false, length = 20)
    private String authorRole;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "visible_to_client", nullable = false)
    private boolean visibleToClient;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
