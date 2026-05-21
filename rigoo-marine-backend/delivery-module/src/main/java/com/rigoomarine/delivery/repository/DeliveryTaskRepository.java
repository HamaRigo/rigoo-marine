package com.rigoomarine.delivery.repository;

import com.rigoomarine.delivery.entity.DeliveryTask;
import com.rigoomarine.delivery.entity.DeliveryTaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
