package com.rigoomarine.workorder.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrderAttachmentDTO {
    private Long id;
    private Long workOrderId;
    private Long uploadedBy;
    private String originalName;
    private String contentType;
    private Long fileSize;
    private String downloadUrl;
    private LocalDateTime createdAt;
}
