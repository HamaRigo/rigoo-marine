package com.rigoomarine.delivery.repository;

import com.rigoomarine.delivery.entity.DeliveryTask;
import com.rigoomarine.delivery.entity.DeliveryTaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface DeliveryTaskRepository extends JpaRepository<DeliveryTask, Long> {

    List<DeliveryTask> findByAssignedToAndScheduledDateOrderByStopOrderAscIdAsc(Long assignedTo, LocalDate date);

    Page<DeliveryTask> findByScheduledDateAndAssignedTo(LocalDate date, Long assignedTo, Pageable pageable);

    Page<DeliveryTask> findByScheduledDate(LocalDate date, Pageable pageable);

    Page<DeliveryTask> findByStatus(DeliveryTaskStatus status, Pageable pageable);

    Page<DeliveryTask> findByScheduledDateAndStatus(LocalDate date, DeliveryTaskStatus status, Pageable pageable);

    Page<DeliveryTask> findByScheduledDateAndAssignedToAndStatus(
            LocalDate date, Long assignedTo, DeliveryTaskStatus status, Pageable pageable);

    @Query("SELECT DISTINCT t.assignedTo FROM DeliveryTask t " +
           "WHERE t.scheduledDate = :date AND t.assignedTo IS NOT NULL " +
           "AND t.status NOT IN :terminalStatuses")
    List<Long> findActiveTechIdsForDate(
            @Param("date") LocalDate date,
            @Param("terminalStatuses") List<DeliveryTaskStatus> terminalStatuses);
}
