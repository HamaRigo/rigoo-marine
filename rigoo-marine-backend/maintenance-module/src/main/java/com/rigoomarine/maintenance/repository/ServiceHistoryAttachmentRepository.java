package com.rigoomarine.maintenance.repository;

import com.rigoomarine.maintenance.entity.ServiceHistoryAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ServiceHistoryAttachmentRepository
        extends JpaRepository<ServiceHistoryAttachment, Long> {

    /**
     * Batch fetch for the dossier read — one query for every history row
     * on the page. Uses the idx_attachments_history index. Caller groups
     * by serviceHistoryId in Java.
     */
    List<ServiceHistoryAttachment> findByServiceHistoryIdIn(Collection<Long> serviceHistoryIds);

    List<ServiceHistoryAttachment> findByServiceHistoryId(Long serviceHistoryId);

    long countByServiceHistoryId(Long serviceHistoryId);
}
