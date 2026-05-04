package com.rigoomarine.workorder.dto;

import com.rigoomarine.workorder.entity.IssueCategory;
import com.rigoomarine.workorder.entity.SubmittedByRole;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ServiceRequestRequest {

    @NotNull(message = "Client ID is required")
    private Long clientId;

    @NotNull(message = "Vessel ID is required")
    private Long vesselId;

    @NotNull(message = "Submitter role is required")
    private SubmittedByRole submittedByRole;

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Location is required")
    @Size(max = 500)
    private String locationText;

    @DecimalMin(value = "-90.0")  @DecimalMax(value = "90.0")
    private BigDecimal latitude;

    @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0")
    private BigDecimal longitude;

    @Size(max = 50)
    private String phone;

    @NotNull(message = "Issue category is required")
    private IssueCategory issueCategory;

    @Size(max = 255)
    private String issueCategoryOther;

    @Size(max = 5, message = "Up to 5 media files allowed")
    private Set<String> mediaUrls;
}
