package com.rigoomarine.technician.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TechnicianDTO {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String specialization;
    private String certification;
    private Boolean available;
    private Integer experienceYears;
    private LocalDateTime createdAt;
}
