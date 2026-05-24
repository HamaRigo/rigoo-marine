package com.rigoomarine.client.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateGalleryItemRequest {

    @NotBlank
    private String title;

    private String titleAr;

    private String description;
    private String descriptionAr;

    @NotBlank
    private String category;

    @NotBlank
    private String beforeUrl;

    @NotBlank
    private String afterUrl;

    private Integer displayOrder;
    private Boolean published;
}
