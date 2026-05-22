package com.rigoomarine.maintenance.dto;

import com.rigoomarine.maintenance.entity.VesselInspection;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class VesselInspectionDTO {
    private Long id;
    private Long vesselId;
    private Long clientId;
    private Long inspectorId;
    private LocalDate inspectionDate;
    private String type;
    private String status;
    private String findings;
    private String notes;
    private LocalDate nextInspectionDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static VesselInspectionDTO from(VesselInspection e) {
        return VesselInspectionDTO.builder()
            .id(e.getId())
            .vesselId(e.getVesselId())
            .clientId(e.getClientId())
            .inspectorId(e.getInspectorId())
            .inspectionDate(e.getInspectionDate())
            .type(e.getType() != null ? e.getType().name() : null)
            .status(e.getStatus() != null ? e.getStatus().name() : null)
            .findings(e.getFindings())
            .notes(e.getNotes())
            .nextInspectionDate(e.getNextInspectionDate())
            .createdAt(e.getCreatedAt())
            .updatedAt(e.getUpdatedAt())
            .build();
    }
}
