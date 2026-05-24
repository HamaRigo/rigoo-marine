package com.rigoomarine.delivery.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "delivery_settings")
@Getter
@Setter
@NoArgsConstructor
public class DeliverySettings {

    @Id
    private Long id = 1L;

    @Column(name = "history_days", nullable = false)
    private int historyDays = 7;
}
