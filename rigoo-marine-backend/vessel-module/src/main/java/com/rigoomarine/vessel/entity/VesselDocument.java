package com.rigoomarine.vessel.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "vessel_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VesselDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long vesselId;

    /** Denormalised for cheap ownership checks without joining to vessels. */
    @Column(nullable = false)
    private Long clientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DocumentType documentType;

    @Column(nullable = false, length = 255)
    private String documentName;

    /** CDN / S3 URL returned by the file-upload endpoint. */
    @Column(nullable = false, length = 1024)
    private String url;

    private Long fileSize;

    @Column(length = 100)
    private String mimeType;

    private LocalDate issueDate;

    /** Null = no expiry (e.g., registration may be perpetual). */
    private LocalDate expiryDate;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
