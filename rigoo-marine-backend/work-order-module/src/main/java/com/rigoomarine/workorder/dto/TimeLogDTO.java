package com.rigoomarine.workorder.dto;

import com.rigoomarine.workorder.entity.WorkOrderTimeLog;
import lombok.*;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TimeLogDTO {
    private Long id;
    private Long workOrderId;
    private Long technicianId;
    private LocalDateTime clockIn;
    private LocalDateTime clockOut;
    private Integer durationMin;
    private String note;
    private boolean open;

    public static TimeLogDTO from(WorkOrderTimeLog e) {
        return TimeLogDTO.builder()
            .id(e.getId())
            .workOrderId(e.getWorkOrderId())
            .technicianId(e.getTechnicianId())
            .clockIn(e.getClockIn())
            .clockOut(e.getClockOut())
            .durationMin(e.getDurationMin())
            .note(e.getNote())
            .open(e.isOpen())
            .build();
    }
}
