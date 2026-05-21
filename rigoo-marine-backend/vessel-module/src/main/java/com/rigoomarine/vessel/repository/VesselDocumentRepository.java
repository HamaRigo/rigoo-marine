package com.rigoomarine.vessel.repository;

import com.rigoomarine.vessel.entity.VesselDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface VesselDocumentRepository extends JpaRepository<VesselDocument, Long> {

    /** All documents for a vessel, sorted by expiry date ascending (nulls last). */
    @Query("""
        SELECT d FROM VesselDocument d
        WHERE d.vesselId = :vesselId
        ORDER BY
            CASE WHEN d.expiryDate IS NULL THEN 1 ELSE 0 END,
            d.expiryDate ASC,
            d.createdAt DESC
        """)
    List<VesselDocument> findByVesselIdOrdered(@Param("vesselId") Long vesselId);

    /** Ownership + id lookup — 404-collapses for non-owners. */
    Optional<VesselDocument> findByIdAndClientId(Long id, Long clientId);

    /** Documents expiring within the next N days (for expiry-alert sweep). */
    @Query("""
        SELECT d FROM VesselDocument d
        WHERE d.expiryDate IS NOT NULL
          AND d.expiryDate BETWEEN :today AND :horizon
        ORDER BY d.expiryDate ASC
        """)
    List<VesselDocument> findExpiringSoon(
        @Param("today")   LocalDate today,
        @Param("horizon") LocalDate horizon
    );

    boolean existsByIdAndClientId(Long id, Long clientId);
}
