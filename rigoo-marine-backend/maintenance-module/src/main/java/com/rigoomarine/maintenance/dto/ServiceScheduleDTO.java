package com.rigoomarine.maintenance.dto;

import com.rigoomarine.maintenance.entity.ScheduleStatus;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.entity.Urgency;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceScheduleDTO {
    private Long id;
    private Long vesselId;
    private ServiceType serviceType;
    private Integer intervalDays;
    private BigDecimal intervalHours;
    private LocalDate nextDueDate;
    private BigDecimal nextDueHours;
    private ScheduleStatus status;
    private LocalDate snoozedUntil;
    /** Classification derived at read time from current vessel engine hours + today. */
    private Urgency urgency;
    private Integer daysUntilDue;
    private BigDecimal hoursUntilDue;
}
