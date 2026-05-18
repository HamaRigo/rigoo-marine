package com.rigoomarine.client.teamrequest;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface TeamRequestRepository extends JpaRepository<TeamRequest, Long> {

    Page<TeamRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<TeamRequest> findByStatusOrderByCreatedAtDesc(TeamRequestStatus status, Pageable pageable);

    /** Duplicate guard: one PENDING per phone within the last 24h. */
    @Query("""
        SELECT r FROM TeamRequest r
        WHERE r.contactPhone = :phone
          AND r.status = 'PENDING'
          AND r.createdAt > :since
        """)
    Optional<TeamRequest> findPendingByPhone(@Param("phone") String phone,
                                             @Param("since") LocalDateTime since);

    long countByStatus(TeamRequestStatus status);
}
