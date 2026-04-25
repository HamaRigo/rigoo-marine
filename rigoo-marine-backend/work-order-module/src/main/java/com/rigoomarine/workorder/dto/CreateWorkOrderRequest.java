package com.rigoomarine.workorder.dto;

import lombok.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateWorkOrderRequest {

    @NotNull(message = "Client ID is required")
    private Long clientId;

    @NotNull(message = "Vessel ID is required")
    private Long vesselId;

    @NotBlank(message = "Description is required")
    private String description;

    private String priority;
    private LocalDateTime preferredDate;
    private Set<Long> serviceIds;
    private String notes;

    // Diagnostic fields
    private String issueCategory;
    private String severity;
    private String symptoms;

    // Media URLs (already uploaded)
    private Set<String> mediaUrls;
}
