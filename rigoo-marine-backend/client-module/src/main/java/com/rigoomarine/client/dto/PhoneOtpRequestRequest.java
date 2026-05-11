package com.rigoomarine.client.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PhoneOtpRequestRequest {
    @NotBlank(message = "Phone number is required")
    private String phone;
}
