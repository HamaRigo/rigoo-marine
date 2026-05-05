package com.rigoomarine.shop.dto;

import com.rigoomarine.shop.entity.ProductInquiry;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateProductInquiryRequest {

    // Optional — required only for QUOTE/STOCK_CHECK; service enforces.
    private Long productId;

    private Long userId;  // optional — may be a guest

    @NotBlank
    @Size(max = 255)
    private String name;

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @Size(max = 50)
    private String phone;

    @Size(max = 4000)
    private String message;

    @Min(1)
    private Integer quantity;

    @NotNull
    private ProductInquiry.InquiryType inquiryType;
}
