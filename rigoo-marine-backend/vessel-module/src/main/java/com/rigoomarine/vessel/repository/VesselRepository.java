package com.rigoomarine.vessel.repository;

import com.rigoomarine.vessel.entity.Vessel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VesselRepository extends JpaRepository<Vessel, Long> {
    List<Vessel> findByClientId(Long clientId);

    boolean existsByIdAndClientId(Long id, Long clientId);
}
