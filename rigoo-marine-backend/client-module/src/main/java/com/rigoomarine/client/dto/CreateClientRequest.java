package com.rigoomarine.client.dto;

import lombok.*;
import jakarta.validation.constraints.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateClientRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone is required")
    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String role;
    private String address;
    private String company;

    /**
     * Optional on create + update. When null on create, ClientService falls
     * back to "en". Validated lightly — anything beyond 5 chars is rejected;
     * the consumer layer treats unknown locales as "en".
     */
    @Size(max = 5, message = "preferredLanguage must be a BCP-47 short tag")
    private String preferredLanguage;

    /** Optional WhatsApp opt-in flag. Profile editor passes this through. */
    private Boolean whatsappOptIn;
}
