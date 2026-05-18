package com.rigoomarine.invoice.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceDTO {
    private Long id;
    private String invoiceNumber;
    private Long workOrderId;
    private Long clientId;
    private String billToName;
    private String billToEmail;
    private String billToPhone;
    private String billToAddress;
    private String billToCompany;
    private String status;
    private LocalDateTime issueDate;
    private LocalDateTime dueDate;
    private List<InvoiceItemDTO> items;
    private BigDecimal subtotal;
    private BigDecimal taxRate;
    private BigDecimal taxAmount;
    private BigDecimal total;
    private String notes;
    private String terms;
    private String termsArabic;
    private String logoUrl;
    private List<String> insertedImages;
    private String watermark;
    private String qrCode;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;

    // Customer info for display
    private CustomerInfo customer;
    private CompanyInfo company;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerInfo {
        private String name;
        private String address;
        private String phone;
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CompanyInfo {
        private String name;
        private String logo;
        private String address;
        private String phone;
        private String email;
        private String taxId;
        private String tagline;
    }
}
