package com.rigoomarine.workorder.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_order_time_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderTimeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_order_id", nullable = false)
    private Long workOrderId;

    @Column(name = "technician_id", nullable = false)
    private Long technicianId;

    @Column(name = "clock_in", nullable = false)
    private LocalDateTime clockIn;

    @Column(name = "clock_out")
    private LocalDateTime clockOut;

    // duration_min is a generated column — never set it in Java.
    @Column(name = "duration_min", insertable = false, updatable = false)
    private Integer durationMin;

    private String note;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (clockIn == null) clockIn = LocalDateTime.now();
    }

    public boolean isOpen() {
        return clockOut == null;
    }
}
