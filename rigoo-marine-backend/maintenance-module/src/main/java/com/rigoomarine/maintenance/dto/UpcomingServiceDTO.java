package com.rigoomarine.maintenance.dto;

import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.entity.Urgency;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Flat dashboard-widget shape, joining a {@link ServiceScheduleDTO} to the
 * minimal vessel context the UI needs to render a row.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpcomingServiceDTO {
    private Long vesselId;
    private String vesselName;
    private ServiceType serviceType;
    private LocalDate nextDueDate;
    private BigDecimal nextDueHours;
    private Integer daysUntilDue;
    private BigDecimal hoursUntilDue;
    private Urgency urgency;
}
