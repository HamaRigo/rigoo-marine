package com.rigoomarine.delivery.repository;

import com.rigoomarine.delivery.entity.DeliverySettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliverySettingsRepository extends JpaRepository<DeliverySettings, Long> {
}
