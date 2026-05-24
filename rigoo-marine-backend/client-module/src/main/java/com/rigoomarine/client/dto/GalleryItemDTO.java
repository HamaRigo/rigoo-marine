package com.rigoomarine.client.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryItemDTO {
    private Long id;
    private String title;
    private String titleAr;
    private String description;
    private String descriptionAr;
    private String category;
    private String beforeUrl;
    private String afterUrl;
    private Integer displayOrder;
    private Boolean published;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
