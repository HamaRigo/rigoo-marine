package com.rigoomarine.workorder.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_parts")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class InventoryPart {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "quantity_on_hand", nullable = false)
    private Integer quantityOnHand = 0;

    @Column(name = "reorder_level", nullable = false)
    private Integer reorderLevel = 5;

    @Column(name = "unit_cost_qar", precision = 10, scale = 2)
    private BigDecimal unitCostQar;

    private String supplier;
    private String location;
    private String category;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist  protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate   protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public boolean isLowStock() {
        return quantityOnHand != null && reorderLevel != null
            && quantityOnHand <= reorderLevel;
    }
}
