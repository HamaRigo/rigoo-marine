package com.rigoomarine.delivery.dto;

import com.rigoomarine.delivery.entity.DeliveryTaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateStatusRequest {
    @NotNull
    private DeliveryTaskStatus status;
    private String failedReason;
}
