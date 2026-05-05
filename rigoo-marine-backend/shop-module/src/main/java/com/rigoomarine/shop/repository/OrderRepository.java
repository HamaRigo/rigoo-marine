package com.rigoomarine.shop.repository;

import com.rigoomarine.shop.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
    Optional<Order> findByOrderNumber(String orderNumber);
    Optional<Order> findByStripeSessionId(String stripeSessionId);
    Page<Order> findByUserEmail(String userEmail, Pageable pageable);
    boolean existsByOrderNumber(String orderNumber);
}
