package com.rigoomarine.maintenance.repository;

import com.rigoomarine.maintenance.entity.ScheduleStatus;
import com.rigoomarine.maintenance.entity.ServiceScheduleItem;
import com.rigoomarine.maintenance.entity.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceScheduleItemRepository extends JpaRepository<ServiceScheduleItem, Long> {

    List<ServiceScheduleItem> findByVesselId(Long vesselId);

    List<ServiceScheduleItem> findByClientId(Long clientId);

    Optional<ServiceScheduleItem> findByVesselIdAndServiceType(Long vesselId, ServiceType serviceType);

    /**
     * Reminder-sweep candidates: ACTIVE, not-snoozed, debounced past the cooldown,
     * AND due-soon (calendar OR engine-hours). Engine-hours comparison is done
     * application-side because vessel state lives in vessel-service — this query
     * returns the date-driven and unbounded-hours candidates; the detector then
     * cross-references each one with the vessel's current engine hours.
     *
     * <p>{@code FOR UPDATE SKIP LOCKED} mirrors the EmailOutboxRedriver pattern so
     * multiple scheduler replicas can sweep concurrently without double-publishing.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(value = """
        SELECT * FROM service_schedule
         WHERE status = 'ACTIVE'
           AND (snoozed_until IS NULL OR snoozed_until < :today)
           AND (last_notified_at IS NULL OR last_notified_at < :cooldownBefore)
           AND (
                next_due_date IS NOT NULL AND next_due_date <= :horizon
             OR next_due_hours IS NOT NULL
           )
         ORDER BY next_due_date NULLS LAST, id ASC
         FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    List<ServiceScheduleItem> findSweepCandidates(
        @Param("today") LocalDate today,
        @Param("horizon") LocalDate horizon,
        @Param("cooldownBefore") java.time.Instant cooldownBefore
    );
}
