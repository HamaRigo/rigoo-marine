package com.rigoomarine.vessel.dto;

import com.rigoomarine.vessel.entity.DocumentType;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VesselDocumentDTO {
    private Long id;
    private Long vesselId;
    private DocumentType documentType;
    private String documentName;
    private String url;
    private Long fileSize;
    private String mimeType;
    private LocalDate issueDate;
    private LocalDate expiryDate;
    private String notes;
    private Instant createdAt;
    /** True when expiryDate is within the next 30 days or already past. */
    private boolean expiringSoon;
    private boolean expired;
}
