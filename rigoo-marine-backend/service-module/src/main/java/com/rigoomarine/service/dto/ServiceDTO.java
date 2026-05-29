package com.rigoomarine.service.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceDTO {
    private Long id;
    private String name;
    private String nameAr;
    private String category;
    private String description;
    private String descriptionAr;
    private BigDecimal price;
    private Boolean active;
    private String imageUrl;
    private LocalDateTime createdAt;
}
