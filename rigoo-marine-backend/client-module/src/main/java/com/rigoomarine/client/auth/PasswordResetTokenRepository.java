package com.rigoomarine.client.auth;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /**
     * Burn any other unused, unexpired tokens for this client when a new one is issued.
     * Single-active-token policy.
     */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now " +
           "WHERE t.clientId = :clientId AND t.usedAt IS NULL AND t.expiresAt > :now")
    int invalidateActiveForClient(@Param("clientId") Long clientId, @Param("now") LocalDateTime now);
}
