package com.rigoomarine.workorder.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostUpdateRequest {
    @NotBlank
    private String message;
    private boolean visibleToClient = true;
}
