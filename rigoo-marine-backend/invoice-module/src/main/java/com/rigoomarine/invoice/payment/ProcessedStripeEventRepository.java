package com.rigoomarine.invoice.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedStripeEventRepository extends JpaRepository<ProcessedStripeEvent, String> {
    boolean existsByEventId(String eventId);
}
