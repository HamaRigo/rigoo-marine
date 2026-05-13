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

    /**
     * Bounded purge of terminally-SENT rows older than {@code threshold}.
     * Native query because JPA-QL doesn't accept {@code DELETE ... LIMIT};
     * Postgres needs the subquery shape. Uses {@code last_attempt_at} (set on
     * each settle) rather than {@code created_at} so a row that was FAILED
     * for days before turning SENT only starts its retention clock from the
     * SENT moment.
     *
     * @return the number of SENT rows deleted in this batch.
     */
    @Modifying
    @Query(value = """
        DELETE FROM email_outbox
        WHERE id IN (
            SELECT id FROM email_outbox
            WHERE status = 'SENT' AND last_attempt_at < :threshold
            LIMIT :batchSize
        )
        """, nativeQuery = true)
    int deleteSentOlderThan(@Param("threshold") LocalDateTime threshold,
                            @Param("batchSize") int batchSize);

    /**
     * Bounded purge of DEAD rows older than {@code threshold}. Retention is
     * longer than SENT (30 days vs 7) because DEAD rows reflect permanent
     * failures that ops may want to inspect over multiple weeks.
     *
     * @return the number of DEAD rows deleted in this batch.
     */
    @Modifying
    @Query(value = """
        DELETE FROM email_outbox
        WHERE id IN (
            SELECT id FROM email_outbox
            WHERE status = 'DEAD' AND last_attempt_at < :threshold
            LIMIT :batchSize
        )
        """, nativeQuery = true)
    int deleteDeadOlderThan(@Param("threshold") LocalDateTime threshold,
                            @Param("batchSize") int batchSize);
}
