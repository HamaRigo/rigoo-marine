package com.rigoomarine.workorder.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderDTO {
    private Long id;
    private Long clientId;
    private Long vesselId;
    private String status;
    private String description;
    private String priority;
    private LocalDateTime preferredDate;
    private Long assignedTechnicianId;
    private String notes;
    private Set<Long> serviceIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;

    // Diagnostic fields
    private String issueCategory;
    private String severity;
    private String symptoms;

    // Media URLs
    private Set<String> mediaUrls;
}
