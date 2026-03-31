package com.rigoomarine.technician.repository;

import com.rigoomarine.technician.entity.Technician;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TechnicianRepository extends JpaRepository<Technician, Long> {
    List<Technician> findByAvailableTrue();
    List<Technician> findBySpecializationContaining(String specialization);
}
