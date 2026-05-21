package com.rigoomarine.vessel.repository;

import com.rigoomarine.vessel.entity.FuelLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface FuelLogRepository extends JpaRepository<FuelLog, Long> {

    /** Paged log for the vessel detail page (all years). */
    Page<FuelLog> findByVesselIdOrderByLogDateDescIdDesc(Long vesselId, Pageable pageable);

    /** Year-scoped log for analytics query. */
    @Query("""
        SELECT f FROM FuelLog f
        WHERE f.vesselId = :vesselId
          AND FUNCTION('YEAR', f.logDate) = :year
        ORDER BY f.logDate DESC
        """)
    List<FuelLog> findByVesselIdAndYear(
        @Param("vesselId") Long vesselId,
        @Param("year")     int year
    );

    /** Ownership guard for delete. */
    Optional<FuelLog> findByIdAndClientId(Long id, Long clientId);

    boolean existsByIdAndClientId(Long id, Long clientId);
}
