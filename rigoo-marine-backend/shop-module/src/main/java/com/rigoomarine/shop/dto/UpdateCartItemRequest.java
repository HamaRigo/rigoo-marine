package com.rigoomarine.shop.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCartItemRequest {
    @NotNull
    @Min(1)
    private Integer quantity;
}
