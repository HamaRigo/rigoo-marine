package com.rigoomarine.client.mail;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface EmailOutboxRepository extends JpaRepository<EmailOutboxEntry, Long> {

    long countByStatus(String status);

    /**
     * Multi-instance-safe claim. Atomically transitions up to {@code limit}
     * rows from FAILED→RETRYING and stamps {@code claimed_at}. The inner
     * SELECT uses {@code FOR UPDATE SKIP LOCKED} (Postgres) so concurrent
     * scheduler instances don't block on each other.
     *
     * <p>Returns the count actually claimed; callers re-query by status to
     * fetch the claimed rows. (A {@code RETURNING *} would be cleaner but
     * Spring Data JPA's {@code @Modifying} can't carry the result.)
     */
    @Modifying
    @Query(value = """
        UPDATE email_outbox
        SET status = 'RETRYING', claimed_at = :now
        WHERE id IN (
            SELECT id FROM email_outbox
            WHERE status = 'FAILED' AND next_retry_at <= :now
            ORDER BY next_retry_at
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
        )
        """, nativeQuery = true)
    int claim(@Param("now") LocalDateTime now, @Param("limit") int limit);

    /** Returns rows the current process just claimed. Cheap — indexed by status. */
    List<EmailOutboxEntry> findAllByStatusAndClaimedAtGreaterThanEqual(String status, LocalDateTime since);

    /**
     * Returns any RETRYING rows whose claim is older than {@code threshold}
     * (worker presumably crashed) back to FAILED so the next cycle picks them up.
     * Idempotent — safe to run every cycle.
     */
    @Modifying
    @Query(value = """
        UPDATE email_outbox
        SET status = 'FAILED', claimed_at = NULL
        WHERE status = 'RETRYING' AND claimed_at < :threshold
        """, nativeQuery = true)
    int reclaimStale(@Param("threshold") LocalDateTime threshold);
}
