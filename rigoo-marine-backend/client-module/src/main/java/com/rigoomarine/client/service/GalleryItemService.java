package com.rigoomarine.client.service;

import com.rigoomarine.client.dto.CreateGalleryItemRequest;
import com.rigoomarine.client.dto.GalleryItemDTO;
import com.rigoomarine.client.entity.GalleryItem;
import com.rigoomarine.client.repository.GalleryItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class GalleryItemService {

    private final GalleryItemRepository repo;

    @Transactional(readOnly = true)
    public List<GalleryItemDTO> getAll() {
        return repo.findAllByOrderByDisplayOrderAscCreatedAtDesc().stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<GalleryItemDTO> getPublished() {
        return repo.findAllPublished().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GalleryItemDTO getById(Long id) {
        return repo.findById(id).map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Gallery item not found: " + id));
    }

    public GalleryItemDTO create(CreateGalleryItemRequest req) {
        GalleryItem item = GalleryItem.builder()
                .title(req.getTitle())
                .titleAr(req.getTitleAr())
                .description(req.getDescription())
                .descriptionAr(req.getDescriptionAr())
                .category(req.getCategory())
                .beforeUrl(req.getBeforeUrl())
                .afterUrl(req.getAfterUrl())
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0)
                .published(req.getPublished() != null ? req.getPublished() : false)
                .build();
        GalleryItem saved = repo.save(item);
        log.info("Created gallery item: {}", saved.getId());
        return toDTO(saved);
    }

    public GalleryItemDTO update(Long id, CreateGalleryItemRequest req) {
        GalleryItem item = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Gallery item not found: " + id));
        item.setTitle(req.getTitle());
        item.setTitleAr(req.getTitleAr());
        item.setDescription(req.getDescription());
        item.setDescriptionAr(req.getDescriptionAr());
        item.setCategory(req.getCategory());
        item.setBeforeUrl(req.getBeforeUrl());
        item.setAfterUrl(req.getAfterUrl());
        if (req.getDisplayOrder() != null) item.setDisplayOrder(req.getDisplayOrder());
        if (req.getPublished() != null) item.setPublished(req.getPublished());
        return toDTO(repo.save(item));
    }

    public void togglePublished(Long id) {
        GalleryItem item = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Gallery item not found: " + id));
        item.setPublished(!item.getPublished());
        repo.save(item);
    }

    public void delete(Long id) {
        repo.deleteById(id);
        log.info("Deleted gallery item: {}", id);
    }

    private GalleryItemDTO toDTO(GalleryItem g) {
        return GalleryItemDTO.builder()
                .id(g.getId())
                .title(g.getTitle())
                .titleAr(g.getTitleAr())
                .description(g.getDescription())
                .descriptionAr(g.getDescriptionAr())
                .category(g.getCategory())
                .beforeUrl(g.getBeforeUrl())
                .afterUrl(g.getAfterUrl())
                .displayOrder(g.getDisplayOrder())
                .published(g.getPublished())
                .createdAt(g.getCreatedAt())
                .updatedAt(g.getUpdatedAt())
                .build();
    }
}
