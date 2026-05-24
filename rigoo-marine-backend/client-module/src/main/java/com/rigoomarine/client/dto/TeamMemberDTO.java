package com.rigoomarine.client.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TeamMemberDTO {
    private Long id;
    private String name;
    private String nameAr;
    private String role;
    private String roleAr;
    private String bio;
    private String bioAr;
    private String photoUrl;
    private String department;
    private String linkedinUrl;
    private String email;
    private Integer displayOrder;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
