package com.rigoomarine.marketplace.dto;

import com.rigoomarine.marketplace.entity.BoatInquiry;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateInquiryRequest {

    // Optional — required only for BUY/RENT/INSPECTION; service enforces.
    private Long listingId;

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

    @NotNull
    private BoatInquiry.InquiryType inquiryType;
}
