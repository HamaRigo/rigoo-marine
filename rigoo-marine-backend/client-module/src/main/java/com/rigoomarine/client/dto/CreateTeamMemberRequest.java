package com.rigoomarine.client.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTeamMemberRequest {

    @NotBlank
    private String name;

    private String nameAr;

    @NotBlank
    private String role;

    private String roleAr;

    private String bio;
    private String bioAr;
    private String photoUrl;

    private String department = "general";
    private String linkedinUrl;
    private String email;

    private Integer displayOrder = 0;
    private Boolean active = true;
}
