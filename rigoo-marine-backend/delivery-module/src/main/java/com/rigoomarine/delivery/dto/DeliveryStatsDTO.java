package com.rigoomarine.delivery.dto;

public record DeliveryStatsDTO(
        long total,
        long delivered,
        long failed,
        long inTransit,
        long pending,
        long cancelled
) {}
