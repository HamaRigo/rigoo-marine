package com.rigoomarine.invoice.dto;

import lombok.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuotationRequest {

    private Long clientId;
    private String billToName;
    private String billToEmail;
    private String billToPhone;
    private String billToAddress;
    private String billToCompany;

    private String status;
    private LocalDateTime issueDate;
    private LocalDateTime expiryDate;

    @NotEmpty(message = "At least one item is required")
    private List<CreateQuotationItemRequest> items;

    private String notes;
    private String terms;
    private String termsArabic;
    private String logoUrl;
    private List<String> insertedImages;
}
