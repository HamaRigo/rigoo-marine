package com.rigoomarine.marketplace.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoatInquiryDTO {
    private Long id;
    private Long listingId;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String message;
    private String inquiryType;
    private String status;
    private String adminNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
