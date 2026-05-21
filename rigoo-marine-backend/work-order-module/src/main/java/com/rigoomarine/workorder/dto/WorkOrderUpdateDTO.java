package com.rigoomarine.workorder.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderUpdateDTO {
    private Long id;
    private Long workOrderId;
    private Long authorId;
    private String authorRole;
    private String message;
    private boolean visibleToClient;
    private LocalDateTime createdAt;
}
