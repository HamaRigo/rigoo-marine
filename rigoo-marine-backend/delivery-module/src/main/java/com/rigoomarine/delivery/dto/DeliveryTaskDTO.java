package com.rigoomarine.delivery.dto;

import com.rigoomarine.delivery.entity.DeliveryTask;
import com.rigoomarine.delivery.entity.DeliveryTaskStatus;
import com.rigoomarine.delivery.entity.DeliveryTaskType;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
public class DeliveryTaskDTO {
    private final Long id;
    private final DeliveryTaskType type;
    private final Long referenceId;
    private final Long assignedTo;
    private final DeliveryTaskStatus status;
    private final String pickupLabel;
    private final String pickupAddress;
    private final BigDecimal pickupLat;
    private final BigDecimal pickupLng;
    private final String deliveryAddress;
    private final BigDecimal deliveryLat;
    private final BigDecimal deliveryLng;
    private final String clientPhone;
    private final Long invoiceId;
    private final BigDecimal invoiceAmount;
    private final String currency;
    private final LocalDate scheduledDate;
    private final Integer stopOrder;
    private final String notes;
    private final String proofPhotoPath;
    private final LocalDateTime deliveredAt;
    private final String failedReason;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public DeliveryTaskDTO(DeliveryTask t) {
        this.id             = t.getId();
        this.type           = t.getType();
        this.referenceId    = t.getReferenceId();
        this.assignedTo     = t.getAssignedTo();
        this.status         = t.getStatus();
        this.pickupLabel    = t.getPickupLabel();
        this.pickupAddress  = t.getPickupAddress();
        this.pickupLat      = t.getPickupLat();
        this.pickupLng      = t.getPickupLng();
        this.deliveryAddress = t.getDeliveryAddress();
        this.deliveryLat    = t.getDeliveryLat();
        this.deliveryLng    = t.getDeliveryLng();
        this.clientPhone    = t.getClientPhone();
        this.invoiceId      = t.getInvoiceId();
        this.invoiceAmount  = t.getInvoiceAmount();
        this.currency       = t.getCurrency();
        this.scheduledDate  = t.getScheduledDate();
        this.stopOrder      = t.getStopOrder();
        this.notes          = t.getNotes();
        this.proofPhotoPath = t.getProofPhotoPath();
        this.deliveredAt    = t.getDeliveredAt();
        this.failedReason   = t.getFailedReason();
        this.createdAt      = t.getCreatedAt();
        this.updatedAt      = t.getUpdatedAt();
    }
}
