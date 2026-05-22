package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.dto.VesselInspectionDTO;
import com.rigoomarine.maintenance.entity.VesselInspection;
import com.rigoomarine.maintenance.repository.VesselInspectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class VesselInspectionService {

    private final VesselInspectionRepository repo;

    @Transactional(readOnly = true)
    public Page<VesselInspectionDTO> search(Long clientId, Long vesselId, Pageable pageable) {
        if (vesselId != null) return repo.findByVesselId(vesselId, pageable).map(VesselInspectionDTO::from);
        if (clientId != null) return repo.findByClientId(clientId, pageable).map(VesselInspectionDTO::from);
        return repo.findAll(pageable).map(VesselInspectionDTO::from);
    }

    @Transactional(readOnly = true)
    public VesselInspectionDTO getById(Long id) {
        return VesselInspectionDTO.from(repo.findById(id)
            .orElseThrow(() -> new RuntimeException("VesselInspection not found: " + id)));
    }

    public VesselInspectionDTO create(VesselInspection entity) {
        return VesselInspectionDTO.from(repo.save(entity));
    }

    public VesselInspectionDTO updateStatus(Long id, VesselInspection.InspectionStatus status, String findings) {
        VesselInspection inspection = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("VesselInspection not found: " + id));
        inspection.setStatus(status);
        if (findings != null) inspection.setFindings(findings);
        return VesselInspectionDTO.from(repo.save(inspection));
    }

    public void delete(Long id) {
        repo.deleteById(id);
    }
}
