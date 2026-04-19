package com.rigoomarine.client.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContactInfoDTO {
    private Long id;
    private String keyName;
    private String value;
    private String category;
    private Integer displayOrder;
    private Boolean active;
}
