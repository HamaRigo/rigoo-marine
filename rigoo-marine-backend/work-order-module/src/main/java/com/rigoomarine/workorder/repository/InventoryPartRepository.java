package com.rigoomarine.workorder.repository;

import com.rigoomarine.workorder.entity.InventoryPart;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface InventoryPartRepository extends JpaRepository<InventoryPart, Long> {

    @Query("""
        SELECT p FROM InventoryPart p
        WHERE (:q IS NULL OR LOWER(p.name) LIKE %:q% OR LOWER(p.sku) LIKE %:q%)
          AND (:cat IS NULL OR p.category = :cat)
          AND p.active = true
        """)
    Page<InventoryPart> search(String q, String cat, Pageable pageable);

    @Query("SELECT p FROM InventoryPart p WHERE p.quantityOnHand <= p.reorderLevel AND p.active = true")
    List<InventoryPart> findLowStock();

    boolean existsBySku(String sku);
}
