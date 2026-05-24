package com.rigoomarine.client.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "team_members")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "name_ar")
    private String nameAr;

    @Column(nullable = false)
    private String role;

    @Column(name = "role_ar")
    private String roleAr;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "bio_ar", columnDefinition = "TEXT")
    private String bioAr;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(nullable = false)
    @Builder.Default
    private String department = "general";

    @Column(name = "linkedin_url")
    private String linkedinUrl;

    @Column
    private String email;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (displayOrder == null) displayOrder = 0;
        if (active == null) active = true;
        if (department == null) department = "general";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
