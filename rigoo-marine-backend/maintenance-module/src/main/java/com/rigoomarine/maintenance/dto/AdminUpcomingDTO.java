package com.rigoomarine.maintenance.dto;

import com.rigoomarine.maintenance.entity.ScheduleStatus;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.entity.Urgency;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Admin-side cross-client view of one upcoming/overdue service. Flat by design
 * so the React table can sort + filter without traversing nested objects.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUpcomingDTO {
    private Long scheduleId;
    private Long vesselId;
    private String vesselName;
    private Long clientId;
    private String clientName;
    private String clientEmail;
    private String clientPhone;
    private ServiceType serviceType;
    private LocalDate nextDueDate;
    private BigDecimal nextDueHours;
    private BigDecimal currentEngineHours;
    private Integer daysUntilDue;
    private BigDecimal hoursUntilDue;
    private Urgency urgency;
    private ScheduleStatus status;
    private LocalDate snoozedUntil;
}
