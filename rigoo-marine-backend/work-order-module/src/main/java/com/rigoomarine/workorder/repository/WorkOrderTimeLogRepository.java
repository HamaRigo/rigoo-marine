package com.rigoomarine.workorder.repository;

import com.rigoomarine.workorder.entity.WorkOrderTimeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkOrderTimeLogRepository extends JpaRepository<WorkOrderTimeLog, Long> {

    List<WorkOrderTimeLog> findByWorkOrderIdOrderByClockInDesc(Long workOrderId);

    /** Find any open (no clock-out) session for this work order. */
    @Query("SELECT t FROM WorkOrderTimeLog t WHERE t.workOrderId = :wid AND t.clockOut IS NULL")
    Optional<WorkOrderTimeLog> findOpenSession(@Param("wid") Long workOrderId);

    /** Total logged minutes across all completed sessions for a work order. */
    @Query("SELECT COALESCE(SUM(t.durationMin), 0) FROM WorkOrderTimeLog t " +
           "WHERE t.workOrderId = :wid AND t.clockOut IS NOT NULL")
    int totalMinutes(@Param("wid") Long workOrderId);
}
