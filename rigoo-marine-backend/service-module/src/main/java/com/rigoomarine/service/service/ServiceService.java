package com.rigoomarine.service.service;

import com.rigoomarine.service.entity.ServiceEntity;
import com.rigoomarine.service.repository.ServiceRepository;
import com.rigoomarine.service.dto.ServiceDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ServiceService {

    private final ServiceRepository serviceRepository;

    public ServiceDTO createService(ServiceDTO dto) {
        ServiceEntity entity = ServiceEntity.builder()
            .name(dto.getName())
            .category(dto.getCategory())
            .description(dto.getDescription())
            .price(dto.getPrice())
            .active(dto.getActive() != null ? dto.getActive() : true)
            .build();
        ServiceEntity saved = serviceRepository.save(entity);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<ServiceDTO> getAllServices() {
        return serviceRepository.findByActiveTrue().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServiceDTO> getServicesByCategory(String category) {
        return serviceRepository.findByCategory(category).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ServiceDTO getServiceById(Long id) {
        return serviceRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Service not found"));
    }

    public ServiceDTO updateService(Long id, ServiceDTO dto) {
        ServiceEntity entity = serviceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Service not found"));

        entity.setName(dto.getName());
        entity.setCategory(dto.getCategory());
        entity.setDescription(dto.getDescription());
        entity.setPrice(dto.getPrice());
        entity.setActive(dto.getActive());

        ServiceEntity updated = serviceRepository.save(entity);
        return toDTO(updated);
    }

    public void deleteService(Long id) {
        serviceRepository.deleteById(id);
    }

    private ServiceDTO toDTO(ServiceEntity entity) {
        return ServiceDTO.builder()
            .id(entity.getId())
            .name(entity.getName())
            .category(entity.getCategory())
            .description(entity.getDescription())
            .price(entity.getPrice())
            .active(entity.getActive())
            .createdAt(entity.getCreatedAt())
            .build();
    }
}
