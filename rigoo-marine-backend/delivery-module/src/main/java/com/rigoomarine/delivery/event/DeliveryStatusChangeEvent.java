package com.rigoomarine.delivery.event;

import com.rigoomarine.delivery.entity.DeliveryTaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryStatusChangeEvent {
    private String eventId;
    private Instant occurredAt;

    private Long taskId;
    private Long clientId;
    private String clientPhone;
    private DeliveryTaskStatus status;
    private String deliveryAddress;
    private String failedReason;
}
