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

    @NotNull(message = "Client ID is required")
    private Long clientId;

    private String status;
    private LocalDateTime issueDate;
    private LocalDateTime expiryDate;

    @NotEmpty(message = "At least one item is required")
    private List<CreateQuotationItemRequest> items;

    private String notes;
    private String terms;
}
