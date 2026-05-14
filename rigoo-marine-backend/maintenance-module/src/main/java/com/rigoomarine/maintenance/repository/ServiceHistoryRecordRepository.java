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

    @Query("""
        SELECT h FROM ServiceHistoryRecord h
        WHERE h.vesselId = :vesselId
          AND (:type IS NULL OR h.serviceType = :type)
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
}
