package com.rigoomarine.shop.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductInquiryDTO {
    private Long id;
    private Long productId;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String message;
    private Integer quantity;
    private String inquiryType;
    private String status;
    private String adminNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
