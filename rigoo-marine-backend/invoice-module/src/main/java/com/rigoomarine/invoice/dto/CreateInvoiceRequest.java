package com.rigoomarine.invoice.dto;

import lombok.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvoiceRequest {

    private Long workOrderId;

    private Long shopOrderId;

    private Long clientId;

    // Free-text bill-to for unregistered clients. At least one of clientId or
    // billToName must be provided (validated in the service layer).
    private String billToName;
    private String billToEmail;
    private String billToPhone;
    private String billToAddress;
    private String billToCompany;

    private String status;
    private LocalDateTime issueDate;
    private LocalDateTime dueDate;

    @NotEmpty(message = "At least one item is required")
    private List<CreateInvoiceItemRequest> items;

    private String notes;
    private String terms;
    private String termsArabic;
    private String logoUrl;
    private List<String> insertedImages;
    private String qrCode;
}
