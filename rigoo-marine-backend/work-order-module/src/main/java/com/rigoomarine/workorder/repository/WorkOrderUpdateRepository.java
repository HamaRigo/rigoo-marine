package com.rigoomarine.workorder.repository;

import com.rigoomarine.workorder.entity.WorkOrderUpdate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkOrderUpdateRepository extends JpaRepository<WorkOrderUpdate, Long> {
    List<WorkOrderUpdate> findByWorkOrderIdOrderByCreatedAtAsc(Long workOrderId);
}
