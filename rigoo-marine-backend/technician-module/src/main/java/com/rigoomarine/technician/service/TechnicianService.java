package com.rigoomarine.technician.service;

import com.rigoomarine.technician.entity.Technician;
import com.rigoomarine.technician.repository.TechnicianRepository;
import com.rigoomarine.technician.dto.TechnicianDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TechnicianService {

    private final TechnicianRepository technicianRepository;

    @Caching(evict = {
        @CacheEvict(value = "technicians", key = "'all'"),
        @CacheEvict(value = "technicians", key = "'available'")
    })
    public TechnicianDTO createTechnician(TechnicianDTO dto) {
        Technician technician = Technician.builder()
            .name(dto.getName())
            .email(dto.getEmail())
            .phone(dto.getPhone())
            .specialization(dto.getSpecialization())
            .certification(dto.getCertification())
            .available(dto.getAvailable() != null ? dto.getAvailable() : true)
            .experienceYears(dto.getExperienceYears())
            .build();

        Technician saved = technicianRepository.save(technician);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "technicians", key = "'all'")
    public List<TechnicianDTO> getAllTechnicians() {
        return technicianRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "technicians", key = "'available'")
    public List<TechnicianDTO> getAvailableTechnicians() {
        return technicianRepository.findByAvailableTrue().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TechnicianDTO getTechnicianById(Long id) {
        return technicianRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Technician not found"));
    }

    @Caching(evict = {
        @CacheEvict(value = "technicians", key = "'all'"),
        @CacheEvict(value = "technicians", key = "'available'")
    })
    public TechnicianDTO updateTechnician(Long id, TechnicianDTO dto) {
        Technician technician = technicianRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Technician not found"));

        technician.setName(dto.getName());
        technician.setEmail(dto.getEmail());
        technician.setPhone(dto.getPhone());
        technician.setSpecialization(dto.getSpecialization());
        technician.setCertification(dto.getCertification());
        technician.setAvailable(dto.getAvailable());
        technician.setExperienceYears(dto.getExperienceYears());

        Technician updated = technicianRepository.save(technician);
        return toDTO(updated);
    }

    @Caching(evict = {
        @CacheEvict(value = "technicians", key = "'all'"),
        @CacheEvict(value = "technicians", key = "'available'")
    })
    public void deleteTechnician(Long id) {
        technicianRepository.deleteById(id);
    }

    private TechnicianDTO toDTO(Technician technician) {
        return TechnicianDTO.builder()
            .id(technician.getId())
            .name(technician.getName())
            .email(technician.getEmail())
            .phone(technician.getPhone())
            .specialization(technician.getSpecialization())
            .certification(technician.getCertification())
            .available(technician.getAvailable())
            .experienceYears(technician.getExperienceYears())
            .createdAt(technician.getCreatedAt())
            .build();
    }
}
