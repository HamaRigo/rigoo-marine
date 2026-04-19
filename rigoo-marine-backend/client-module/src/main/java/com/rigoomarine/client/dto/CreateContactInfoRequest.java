package com.rigoomarine.client.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateContactInfoRequest {
    @NotBlank(message = "Key name is required")
    private String keyName;

    @NotBlank(message = "Value is required")
    private String value;

    private String category;
    private Integer displayOrder;
    private Boolean active;
}
