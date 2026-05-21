package com.rigoomarine.delivery.dto;

import com.rigoomarine.delivery.entity.DeliveryTaskType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class CreateDeliveryTaskRequest {
    @NotNull
    private DeliveryTaskType type;
    @NotNull
    private Long referenceId;
    @NotBlank
    private String deliveryAddress;
    @NotNull
    private LocalDate scheduledDate;

    private String pickupLabel;
    private String pickupAddress;
    private BigDecimal pickupLat;
    private BigDecimal pickupLng;
    private BigDecimal deliveryLat;
    private BigDecimal deliveryLng;
    private String clientPhone;
    private Long invoiceId;
    private BigDecimal invoiceAmount;
    private Integer stopOrder;
    private String notes;
}
