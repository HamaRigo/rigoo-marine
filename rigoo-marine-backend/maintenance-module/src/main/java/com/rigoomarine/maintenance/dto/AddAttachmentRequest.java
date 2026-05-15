package com.rigoomarine.maintenance.dto;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * Body of POST /api/maintenance/history/{id}/attachments. The frontend
 * has already uploaded the file via fileApi.upload and received the
 * resulting URL; we accept the URL + metadata here to link it.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddAttachmentRequest {

    @NotBlank
    @Size(max = 1024)
    private String url;

    @Size(max = 255)
    private String filename;

    @NotBlank
    @Size(max = 100)
    private String contentType;

    @NotNull
    @Positive
    @Max(value = 10L * 1024L * 1024L, message = "Attachment exceeds 10 MB limit")
    private Long sizeBytes;
}
