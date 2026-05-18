package com.rigoomarine.client.teamrequest;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "team_requests", indexes = {
    @Index(name = "idx_team_req_status",     columnList = "status"),
    @Index(name = "idx_team_req_client",     columnList = "client_id"),
    @Index(name = "idx_team_req_created_at", columnList = "created_at"),
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Null for guest (unauthenticated) submissions. */
    @Column(name = "client_id")
    private Long clientId;

    /** Used when clientId is null (guest) or as override contact. */
    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "location_description", columnDefinition = "TEXT")
    private String locationDescription;

    @Column(name = "whatsapp_opt_in", nullable = false)
    @Builder.Default
    private Boolean whatsappOptIn = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TeamRequestStatus status = TeamRequestStatus.PENDING;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @OneToMany(mappedBy = "teamRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TeamRequestAttachment> attachments = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
