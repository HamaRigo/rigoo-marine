package com.rigoomarine.client.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class PhoneOtpVerifyRequest {
    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotBlank(message = "Code is required")
    @Pattern(regexp = "\\d{4,8}", message = "Code must be 4–8 digits")
    private String code;
}
