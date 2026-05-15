package com.rigoomarine.maintenance.dto;

import com.rigoomarine.maintenance.entity.ServiceHistoryAttachment;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceHistoryAttachmentDTO {
    private Long id;
    private Long serviceHistoryId;
    private String url;
    private String filename;
    private String contentType;
    private Long sizeBytes;
    private Instant uploadedAt;

    public static ServiceHistoryAttachmentDTO from(ServiceHistoryAttachment a) {
        return ServiceHistoryAttachmentDTO.builder()
            .id(a.getId())
            .serviceHistoryId(a.getServiceHistoryId())
            .url(a.getUrl())
            .filename(a.getFilename())
            .contentType(a.getContentType())
            .sizeBytes(a.getSizeBytes())
            .uploadedAt(a.getUploadedAt())
            .build();
    }
}
