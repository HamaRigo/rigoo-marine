package com.rigoomarine.maintenance.dto;

import com.rigoomarine.maintenance.entity.ServiceType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceHistoryDTO {
    private Long id;
    private Long vesselId;
    private Long clientId;
    private ServiceType serviceType;
    private LocalDate performedOn;
    private BigDecimal engineHoursAtService;
    private BigDecimal cost;
    private String currency;
    private String performedBy;
    private Long technicianId;
    private Long workOrderId;
    private String notes;
    private Instant createdAt;
}
