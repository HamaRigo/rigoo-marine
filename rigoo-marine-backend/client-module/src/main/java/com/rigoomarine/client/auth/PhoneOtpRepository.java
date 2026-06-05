package com.rigoomarine.client.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PhoneOtpRepository extends JpaRepository<PhoneOtpEntry, Long> {

    /**
     * The current usable OTP for a phone: not yet used, not yet expired.
     * If multiple exist (shouldn't, due to invalidateActiveForPhone), the
     * most recent one wins.
     */
    Optional<PhoneOtpEntry> findFirstByPhoneAndUsedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
        String phone, LocalDateTime now);

    /**
     * Invalidates every active (un-used, un-expired) entry for a phone by
     * stamping {@code used_at}. Called at the top of each /otp/request so a
     * new request supersedes any prior code in flight.
     */
    @Transactional
    @Modifying
    @Query("""
        UPDATE PhoneOtpEntry e
           SET e.usedAt = :now
         WHERE e.phone = :phone
           AND e.usedAt IS NULL
           AND e.expiresAt > :now
        """)
    int invalidateActiveForPhone(@Param("phone") String phone, @Param("now") LocalDateTime now);

    /**
     * Bounded purge for the scheduled cleanup job. Native query because JPA
     * doesn't support {@code DELETE ... LIMIT} (Postgres requires the
     * subquery shape). Every row has a 5-min TTL by design, so a {@code
     * created_at} cutoff alone covers both used and never-used codes — at 24h
     * past creation, no row is in any usable state.
     *
     * @return the number of rows deleted in this batch.
     */
    @Transactional
    @Modifying
    @Query(value = """
        DELETE FROM phone_otp_codes
        WHERE id IN (
            SELECT id FROM phone_otp_codes
            WHERE created_at < :threshold
            LIMIT :batchSize
        )
        """, nativeQuery = true)
    int deleteOlderThan(@Param("threshold") LocalDateTime threshold,
                        @Param("batchSize") int batchSize);
}
