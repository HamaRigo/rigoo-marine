package com.rigoomarine.client.admin;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminAuditRepository extends JpaRepository<AdminAuditEntry, Long> {

    /** Most recent N actions across all types — ops dashboard default view. */
    List<AdminAuditEntry> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Most recent N actions filtered by action type. */
    List<AdminAuditEntry> findAllByActionOrderByCreatedAtDesc(String action, Pageable pageable);

    /** Full history for a specific target (e.g. "what's been done to user 17?"). */
    List<AdminAuditEntry> findAllByTargetTypeAndTargetIdOrderByCreatedAtDesc(
        String targetType, Long targetId);
}
