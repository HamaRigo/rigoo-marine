package com.rigoomarine.service.repository;

import com.rigoomarine.service.entity.ServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ServiceRepository extends JpaRepository<ServiceEntity, Long> {
    List<ServiceEntity> findByCategory(String category);
    List<ServiceEntity> findByActiveTrue();
}
