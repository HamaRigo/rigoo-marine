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

@Repository
public interface ServiceHistoryRecordRepository extends JpaRepository<ServiceHistoryRecord, Long> {

    List<ServiceHistoryRecord> findByVesselIdOrderByPerformedOnDesc(Long vesselId);

    // Hibernate 6 cannot infer the SQL type for a null enum parameter in JPQL
    // (:type IS NULL OR col = :type) — split into two methods to avoid
    // IllegalArgumentException → 400 when type is null (e.g. dossier load).

    @Query("""
        SELECT h FROM ServiceHistoryRecord h
        WHERE h.vesselId = :vesselId
          AND (:from IS NULL OR h.performedOn >= :from)
          AND (:to   IS NULL OR h.performedOn <= :to)
        ORDER BY h.performedOn DESC, h.id DESC
    """)
    Page<ServiceHistoryRecord> searchAll(
        @Param("vesselId") Long vesselId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to,
        Pageable pageable
    );

    @Query("""
        SELECT h FROM ServiceHistoryRecord h
        WHERE h.vesselId = :vesselId
          AND h.serviceType = :type
          AND (:from IS NULL OR h.performedOn >= :from)
          AND (:to   IS NULL OR h.performedOn <= :to)
        ORDER BY h.performedOn DESC, h.id DESC
    """)
    Page<ServiceHistoryRecord> search(
        @Param("vesselId") Long vesselId,
        @Param("type") ServiceType type,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to,
        Pageable pageable
    );

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
