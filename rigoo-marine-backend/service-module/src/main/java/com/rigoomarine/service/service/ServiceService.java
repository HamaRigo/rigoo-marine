package com.rigoomarine.service.service;

import com.rigoomarine.service.entity.ServiceEntity;
import com.rigoomarine.service.repository.ServiceRepository;
import com.rigoomarine.service.dto.ServiceDTO;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ServiceService {

    private final ServiceRepository serviceRepository;

    @Caching(evict = {
        @CacheEvict(value = "services", allEntries = true)
    })
    public ServiceDTO createService(ServiceDTO dto) {
        ServiceEntity entity = ServiceEntity.builder()
            .name(dto.getName())
            .category(dto.getCategory())
            .description(dto.getDescription())
            .price(dto.getPrice())
            .active(dto.getActive() != null ? dto.getActive() : true)
            .imageUrl(dto.getImageUrl())
            .build();
        ServiceEntity saved = serviceRepository.save(entity);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "services", key = "'all-active'")
    public List<ServiceDTO> getAllServices() {
        return serviceRepository.findByActiveTrue().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ServiceDTO> searchPaged(String q, String category, Boolean active, Pageable pageable) {
        Specification<ServiceEntity> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("description"), "")), like)
                ));
            }
            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return serviceRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "services", key = "#category")
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

    @CacheEvict(value = "services", allEntries = true)
    public ServiceDTO updateService(Long id, ServiceDTO dto) {
        ServiceEntity entity = serviceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Service not found"));

        entity.setName(dto.getName());
        entity.setCategory(dto.getCategory());
        entity.setDescription(dto.getDescription());
        entity.setPrice(dto.getPrice());
        entity.setActive(dto.getActive());
        if (dto.getImageUrl() != null) {
            entity.setImageUrl(dto.getImageUrl());
        }

        ServiceEntity updated = serviceRepository.save(entity);
        return toDTO(updated);
    }

    @CacheEvict(value = "services", allEntries = true)
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
            .imageUrl(entity.getImageUrl())
            .createdAt(entity.getCreatedAt())
            .build();
    }
}
