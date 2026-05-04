package com.rigoomarine.workorder.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "work_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clientId;

    @Column(nullable = false)
    private Long vesselId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private WorkOrderStatus status;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    private String priority;

    private LocalDateTime preferredDate;

    private Long assignedTechnicianId;

    private String notes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @ElementCollection
    @CollectionTable(
        name = "work_order_services",
        joinColumns = @JoinColumn(name = "work_order_id")
    )
    @Column(name = "service_id")
    @Builder.Default
    private Set<Long> serviceIds = new HashSet<>();

    // Store media URLs as JSON string (media is in separate client-service)
    @Column(columnDefinition = "TEXT")
    private String mediaUrls;

    // Diagnostic fields
    private String issueCategory;

    @Column(name = "issue_category_other")
    private String issueCategoryOther;

    private String severity;
    private String symptoms;

    // Service-request fields (Task #5)
    @Column(name = "location_text", length = 500)
    private String locationText;

    @Column(precision = 9, scale = 6)
    private java.math.BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private java.math.BigDecimal longitude;

    @Column(length = 50)
    private String phone;

    @Column(name = "submitted_by_role", length = 20)
    @Enumerated(EnumType.STRING)
    private SubmittedByRole submittedByRole;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private Long approvedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum WorkOrderStatus {
        PENDING_APPROVAL,
        PENDING,
        IN_PROGRESS,
        WAITING_PARTS,
        COMPLETED,
        CANCELLED
    }
}
