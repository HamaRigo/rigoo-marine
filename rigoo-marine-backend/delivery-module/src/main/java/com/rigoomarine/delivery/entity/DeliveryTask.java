package com.rigoomarine.delivery.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_tasks")
@Getter
@Setter
@NoArgsConstructor
public class DeliveryTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeliveryTaskType type;

    @Column(name = "reference_id", nullable = false)
    private Long referenceId;

    @Column(name = "assigned_to")
    private Long assignedTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeliveryTaskStatus status = DeliveryTaskStatus.PENDING;

    @Column(name = "pickup_label", length = 255)
    private String pickupLabel;

    @Column(name = "pickup_address", columnDefinition = "TEXT")
    private String pickupAddress;

    @Column(name = "pickup_lat", precision = 9, scale = 6)
    private BigDecimal pickupLat;

    @Column(name = "pickup_lng", precision = 9, scale = 6)
    private BigDecimal pickupLng;

    @Column(name = "delivery_address", nullable = false, columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "delivery_lat", precision = 9, scale = 6)
    private BigDecimal deliveryLat;

    @Column(name = "delivery_lng", precision = 9, scale = 6)
    private BigDecimal deliveryLng;

    @Column(name = "client_phone", length = 20)
    private String clientPhone;

    @Column(name = "invoice_id")
    private Long invoiceId;

    @Column(name = "invoice_amount", precision = 10, scale = 2)
    private BigDecimal invoiceAmount;

    @Column(length = 5)
    private String currency = "QAR";

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(name = "stop_order")
    private Integer stopOrder;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "proof_photo_path", length = 500)
    private String proofPhotoPath;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "failed_reason", columnDefinition = "TEXT")
    private String failedReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
