package com.rigoomarine.workorder.repository;

import com.rigoomarine.workorder.entity.WorkOrderAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkOrderAttachmentRepository extends JpaRepository<WorkOrderAttachment, Long> {
    List<WorkOrderAttachment> findByWorkOrderIdOrderByCreatedAtAsc(Long workOrderId);
}
