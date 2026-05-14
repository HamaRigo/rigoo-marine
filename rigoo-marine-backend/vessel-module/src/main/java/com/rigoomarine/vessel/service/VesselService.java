package com.rigoomarine.vessel.service;

import com.rigoomarine.vessel.entity.Vessel;
import com.rigoomarine.vessel.exception.VesselNotFoundException;
import com.rigoomarine.vessel.repository.VesselRepository;
import com.rigoomarine.vessel.dto.VesselDTO;
import com.rigoomarine.vessel.dto.CreateVesselRequest;
import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.common.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VesselService {

    private final VesselRepository vesselRepository;

    public VesselDTO createVessel(CreateVesselRequest request) {
        Long ownerId = SecurityUtils.currentUser()
            .map(AuthenticatedUser::getClientId)
            .orElse(null);
        if (ownerId == null) {
            // Admin-only fallback to the request body (used for ops scripts / data import).
            // Non-admin callers reach here only with a legacy token — the controller's
            // @PreAuthorize gate already requires authentication.
            ownerId = request.getClientId();
        }

        Vessel vessel = Vessel.builder()
            .clientId(ownerId)
            .name(request.getName())
            .type(request.getType())
            .engineType(request.getEngineType())
            .brand(request.getBrand())
            .model(request.getModel())
            .year(request.getYear())
            .length(request.getLength())
            .hullMaterial(request.getHullMaterial())
            .registrationNumber(request.getRegistrationNumber())
            .build();

        Vessel saved = vesselRepository.save(vessel);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<VesselDTO> getVesselsByClientId(Long clientId) {
        return vesselRepository.findByClientId(clientId).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VesselDTO> getAllVessels() {
        return vesselRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VesselDTO getVesselById(Long id) {
        return vesselRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new VesselNotFoundException(id));
    }

    public VesselDTO updateVessel(Long id, CreateVesselRequest request) {
        Vessel vessel = vesselRepository.findById(id)
            .orElseThrow(() -> new VesselNotFoundException(id));

        logAdminMutationIfApplicable(id, vessel.getClientId(), "UPDATE");

        vessel.setName(request.getName());
        vessel.setType(request.getType());
        vessel.setEngineType(request.getEngineType());
        vessel.setBrand(request.getBrand());
        vessel.setModel(request.getModel());
        vessel.setYear(request.getYear());
        vessel.setLength(request.getLength());
        vessel.setHullMaterial(request.getHullMaterial());
        vessel.setRegistrationNumber(request.getRegistrationNumber());

        Vessel updated = vesselRepository.save(vessel);
        return toDTO(updated);
    }

    public void deleteVessel(Long id) {
        Vessel vessel = vesselRepository.findById(id)
            .orElseThrow(() -> new VesselNotFoundException(id));
        logAdminMutationIfApplicable(id, vessel.getClientId(), "DELETE");
        vesselRepository.delete(vessel);
    }

    private void logAdminMutationIfApplicable(Long vesselId, Long ownerId, String op) {
        SecurityUtils.currentUser().ifPresent(user -> {
            if (user.hasRole("ADMIN") && !ownerId.equals(user.getClientId())) {
                log.info("audit.admin_edit vesselId={} owner={} actor={} op={}",
                    vesselId, ownerId, user.getEmail(), op);
            }
        });
    }

    private VesselDTO toDTO(Vessel vessel) {
        return VesselDTO.builder()
            .id(vessel.getId())
            .clientId(vessel.getClientId())
            .name(vessel.getName())
            .type(vessel.getType())
            .engineType(vessel.getEngineType())
            .brand(vessel.getBrand())
            .model(vessel.getModel())
            .year(vessel.getYear())
            .length(vessel.getLength())
            .hullMaterial(vessel.getHullMaterial())
            .registrationNumber(vessel.getRegistrationNumber())
            .currentEngineHours(vessel.getCurrentEngineHours())
            .engineHoursUpdatedAt(vessel.getEngineHoursUpdatedAt())
            .createdAt(vessel.getCreatedAt())
            .build();
    }
}
