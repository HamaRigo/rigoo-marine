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

    @NotNull(message = "Work Order ID is required")
    private Long workOrderId;

    @NotNull(message = "Client ID is required")
    private Long clientId;

    private String status;
    private LocalDateTime issueDate;
    private LocalDateTime dueDate;

    @NotEmpty(message = "At least one item is required")
    private List<CreateInvoiceItemRequest> items;

    private String notes;
    private String terms;
    private String qrCode;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class CreateInvoiceItemRequest {
    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Quantity is required")
    private Integer quantity;

    @NotNull(message = "Unit price is required")
    private BigDecimal unitPrice;

    private BigDecimal taxRate;
}
