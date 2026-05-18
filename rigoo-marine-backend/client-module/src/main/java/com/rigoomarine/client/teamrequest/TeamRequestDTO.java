package com.rigoomarine.client.teamrequest;

import java.time.LocalDateTime;
import java.util.List;

public record TeamRequestDTO(
    Long id,
    Long clientId,
    String contactPhone,
    String category,
    String description,
    String locationDescription,
    boolean whatsappOptIn,
    String status,
    String adminNotes,
    List<AttachmentDTO> attachments,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public record AttachmentDTO(Long id, String originalName, String contentType, Long fileSize) {}
}
