package com.rigoomarine.client.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminPasswordResetRequest {
    @NotBlank(message = "New password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String newPassword;

    /**
     * Optional free-text reason captured in the audit row (e.g. "user lost
     * phone, support ticket #1234"). Not surfaced to the target user.
     */
    @Size(max = 500)
    private String reason;
}
