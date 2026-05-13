package com.rigoomarine.client.dto;

import com.rigoomarine.client.admin.AdminAuditEntry;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class AdminAuditDTO {
    Long id;
    String actorEmail;
    Long actorId;
    String action;
    String targetType;
    Long targetId;
    String details;
    String ipAddress;
    LocalDateTime createdAt;

    public static AdminAuditDTO from(AdminAuditEntry e) {
        return AdminAuditDTO.builder()
            .id(e.getId())
            .actorEmail(e.getActorEmail())
            .actorId(e.getActorId())
            .action(e.getAction())
            .targetType(e.getTargetType())
            .targetId(e.getTargetId())
            .details(e.getDetails())
            .ipAddress(e.getIpAddress())
            .createdAt(e.getCreatedAt())
            .build();
    }
}
