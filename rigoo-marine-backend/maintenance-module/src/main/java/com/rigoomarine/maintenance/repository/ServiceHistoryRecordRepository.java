package com.rigoomarine.maintenance.repository;

import com.rigoomarine.maintenance.entity.ServiceHistoryRecord;
import com.rigoomarine.maintenance.entity.ServiceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Hibernate 6 cannot bind null to JPQL parameters when the SQL type cannot be
 * inferred — this applies to both enum params and LocalDate params used with
 * the (:param IS NULL OR col >= :param) pattern.  The fix: never pass null to
 * a JPQL parameter.  Each method below accepts only non-null params, and the
 * service layer dispatches to the right method based on which filters are present.
 */
@Repository
public interface ServiceHistoryRecordRepository extends JpaRepository<ServiceHistoryRecord, Long> {

    List<ServiceHistoryRecord> findByVesselIdOrderByPerformedOnDesc(Long vesselId);

    // ── No-filter queries (Spring Data derives — no JPQL, no null params) ─────

    Page<ServiceHistoryRecord> findByVesselIdOrderByPerformedOnDescIdDesc(
        Long vesselId, Pageable pageable);

    Page<ServiceHistoryRecord> findByVesselIdAndServiceTypeOrderByPerformedOnDescIdDesc(
        Long vesselId, ServiceType serviceType, Pageable pageable);

    // ── Date-range queries (no type filter) ───────────────────────────────────

    @Query("SELECT h FROM ServiceHistoryRecord h WHERE h.vesselId = :vesselId AND h.performedOn >= :from ORDER BY h.performedOn DESC, h.id DESC")
    Page<ServiceHistoryRecord> searchAllFrom(
        @Param("vesselId") Long vesselId,
        @Param("from") LocalDate from,
        Pageable pageable
    );

    @Query("SELECT h FROM ServiceHistoryRecord h WHERE h.vesselId = :vesselId AND h.performedOn <= :to ORDER BY h.performedOn DESC, h.id DESC")
    Page<ServiceHistoryRecord> searchAllTo(
        @Param("vesselId") Long vesselId,
        @Param("to") LocalDate to,
        Pageable pageable
    );

    @Query("SELECT h FROM ServiceHistoryRecord h WHERE h.vesselId = :vesselId AND h.performedOn >= :from AND h.performedOn <= :to ORDER BY h.performedOn DESC, h.id DESC")
    Page<ServiceHistoryRecord> searchAllBetween(
        @Param("vesselId") Long vesselId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to,
        Pageable pageable
    );

    // ── Type + date-range queries ──────────────────────────────────────────────

    @Query("SELECT h FROM ServiceHistoryRecord h WHERE h.vesselId = :vesselId AND h.serviceType = :type AND h.performedOn >= :from ORDER BY h.performedOn DESC, h.id DESC")
    Page<ServiceHistoryRecord> searchFrom(
        @Param("vesselId") Long vesselId,
        @Param("type") ServiceType type,
        @Param("from") LocalDate from,
        Pageable pageable
    );

    @Query("SELECT h FROM ServiceHistoryRecord h WHERE h.vesselId = :vesselId AND h.serviceType = :type AND h.performedOn <= :to ORDER BY h.performedOn DESC, h.id DESC")
    Page<ServiceHistoryRecord> searchTo(
        @Param("vesselId") Long vesselId,
        @Param("type") ServiceType type,
        @Param("to") LocalDate to,
        Pageable pageable
    );

    @Query("SELECT h FROM ServiceHistoryRecord h WHERE h.vesselId = :vesselId AND h.serviceType = :type AND h.performedOn >= :from AND h.performedOn <= :to ORDER BY h.performedOn DESC, h.id DESC")
    Page<ServiceHistoryRecord> searchBetween(
        @Param("vesselId") Long vesselId,
        @Param("type") ServiceType type,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to,
        Pageable pageable
    );

    // ── Misc ──────────────────────────────────────────────────────────────────

    Optional<ServiceHistoryRecord> findFirstByVesselIdAndServiceTypeOrderByPerformedOnDescIdDesc(
        Long vesselId, ServiceType serviceType);

    /**
     * Idempotency check for the work-order auto-history flow. Backed by the
     * partial unique index {@code ux_service_history_workorder_type} which is
     * the authoritative dedup boundary; this method is just the cheap pre-check
     * to avoid the exception path on the common case.
     */
    boolean existsByWorkOrderIdAndServiceType(Long workOrderId, ServiceType serviceType);
}
