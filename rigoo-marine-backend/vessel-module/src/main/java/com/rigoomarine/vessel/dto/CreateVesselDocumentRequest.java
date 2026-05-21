package com.rigoomarine.vessel.dto;

import com.rigoomarine.vessel.entity.DocumentType;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateVesselDocumentRequest {

    @NotNull(message = "Document type is required")
    private DocumentType documentType;

    @NotBlank(message = "Document name is required")
    @Size(max = 255)
    private String documentName;

    @NotBlank(message = "Document URL is required")
    @Size(max = 1024)
    private String url;

    @Positive
    private Long fileSize;

    @Size(max = 100)
    private String mimeType;

    private LocalDate issueDate;
    private LocalDate expiryDate;

    @Size(max = 500)
    private String notes;
}
