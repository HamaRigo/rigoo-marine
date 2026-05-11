package com.rigoomarine.workorder.repository;

import com.rigoomarine.workorder.entity.WorkOrder;
import com.rigoomarine.workorder.entity.WorkOrder.WorkOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long>, JpaSpecificationExecutor<WorkOrder> {
    List<WorkOrder> findByClientId(Long clientId);
    List<WorkOrder> findByStatus(WorkOrderStatus status);
    List<WorkOrder> findByAssignedTechnicianId(Long technicianId);

    boolean existsByIdAndClientId(Long id, Long clientId);
    boolean existsByIdAndAssignedTechnicianId(Long id, Long technicianId);
}
