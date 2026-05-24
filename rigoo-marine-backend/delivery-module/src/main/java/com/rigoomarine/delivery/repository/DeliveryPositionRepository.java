package com.rigoomarine.delivery.repository;

import com.rigoomarine.delivery.entity.DeliveryPosition;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DeliveryPositionRepository extends JpaRepository<DeliveryPosition, Long> {

    @Query(value = """
            SELECT * FROM delivery_positions
            WHERE tech_id = :techId
            ORDER BY recorded_at DESC
            LIMIT :lim
            """, nativeQuery = true)
    List<DeliveryPosition> findLatestByTechId(@Param("techId") Long techId, @Param("lim") int limit);
}
