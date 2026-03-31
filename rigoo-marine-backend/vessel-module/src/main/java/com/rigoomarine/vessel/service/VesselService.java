package com.rigoomarine.vessel.service;

import com.rigoomarine.vessel.entity.Vessel;
import com.rigoomarine.vessel.repository.VesselRepository;
import com.rigoomarine.vessel.dto.VesselDTO;
import com.rigoomarine.vessel.dto.CreateVesselRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class VesselService {

    private final VesselRepository vesselRepository;

    public VesselDTO createVessel(CreateVesselRequest request) {
        Vessel vessel = Vessel.builder()
            .clientId(request.getClientId())
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
    public VesselDTO getVesselById(Long id) {
        return vesselRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Vessel not found"));
    }

    public VesselDTO updateVessel(Long id, CreateVesselRequest request) {
        Vessel vessel = vesselRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Vessel not found"));

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
        vesselRepository.deleteById(id);
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
            .createdAt(vessel.getCreatedAt())
            .build();
    }
}
