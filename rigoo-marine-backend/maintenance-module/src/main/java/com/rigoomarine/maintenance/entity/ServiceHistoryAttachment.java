package com.rigoomarine.maintenance.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Pointer to a file attached to a {@link ServiceHistoryRecord}. The file
 * itself lives in client-module's media storage; we hold only the URL +
 * the metadata needed to render it (filename, content type, size).
 *
 * <p>Foreign key + ON DELETE CASCADE in the V5 migration mean these rows
 * disappear automatically when their parent history record is deleted —
 * no explicit cleanup in service-layer code.
 */
@Entity
@Table(name = "service_history_attachments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceHistoryAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "service_history_id", nullable = false)
    private Long serviceHistoryId;

    /**
     * Denormalised from the parent history row so ownership checks don't
     * require a JOIN. Maintained at insert time; stale clientId here would
     * indicate a history-record ownership transfer, which doesn't happen
     * in the current model.
     */
    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(nullable = false, length = 1024)
    private String url;

    @Column(length = 255)
    private String filename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "uploaded_at", updatable = false)
    private Instant uploadedAt;

    @PrePersist
    void onCreate() {
        if (uploadedAt == null) uploadedAt = Instant.now();
    }
}
