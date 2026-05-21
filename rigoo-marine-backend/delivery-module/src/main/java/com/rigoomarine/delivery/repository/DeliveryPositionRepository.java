package com.rigoomarine.delivery.repository;

import com.rigoomarine.delivery.entity.DeliveryPosition;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryPositionRepository extends JpaRepository<DeliveryPosition, Long> {
}
