package com.rigoomarine.maintenance.dto;

import com.rigoomarine.maintenance.entity.ServiceType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceHistoryDTO {
    private Long id;
    private Long vesselId;
    private Long clientId;
    private ServiceType serviceType;
    private LocalDate performedOn;
    private BigDecimal engineHoursAtService;
    private BigDecimal cost;
    private String currency;
    private String performedBy;
    private Long technicianId;
    private Long workOrderId;
    private String notes;
    private Instant createdAt;
    /**
     * Populated by the dossier read path via a single batched query
     * (no N+1). The single-record paths (add-history response, paged
     * history endpoint) leave this null since the caller hasn't asked
     * for attachments — they fetch them via the dedicated endpoint
     * when needed.
     */
    private List<ServiceHistoryAttachmentDTO> attachments;
}
