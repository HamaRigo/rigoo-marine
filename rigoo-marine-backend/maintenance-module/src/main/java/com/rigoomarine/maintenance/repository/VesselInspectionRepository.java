package com.rigoomarine.maintenance.repository;

import com.rigoomarine.maintenance.entity.VesselInspection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VesselInspectionRepository extends JpaRepository<VesselInspection, Long> {
    Page<VesselInspection> findByClientId(Long clientId, Pageable pageable);
    Page<VesselInspection> findByVesselId(Long vesselId, Pageable pageable);
}
