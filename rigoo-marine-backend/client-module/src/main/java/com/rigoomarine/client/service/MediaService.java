package com.rigoomarine.client.service;

import com.rigoomarine.client.dto.CreateMediaRequest;
import com.rigoomarine.client.dto.MediaDTO;
import com.rigoomarine.client.entity.Media;
import com.rigoomarine.client.repository.MediaRepository;
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
public class MediaService {

    private final MediaRepository mediaRepository;

    @Transactional(readOnly = true)
    public List<MediaDTO> getAllMedia() {
        return mediaRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MediaDTO> getMediaByType(String type) {
        Media.MediaType mediaType = Media.MediaType.valueOf(type.toUpperCase());
        return mediaRepository.findByType(mediaType).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MediaDTO> getMediaByCategory(String category) {
        return mediaRepository.findByCategory(category).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MediaDTO getMediaById(Long id) {
        return mediaRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Media not found with id: " + id));
    }

    public MediaDTO createMedia(CreateMediaRequest request) {
        Media media = Media.builder()
                .title(request.getTitle())
                .url(request.getUrl())
                .type(Media.MediaType.valueOf(request.getType().toUpperCase()))
                .description(request.getDescription())
                .category(request.getCategory())
                .build();

        Media saved = mediaRepository.save(media);
        log.info("Created media: {}", saved.getId());
        return toDTO(saved);
    }

    public MediaDTO updateMedia(Long id, CreateMediaRequest request) {
        Media media = mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Media not found with id: " + id));

        media.setTitle(request.getTitle());
        media.setUrl(request.getUrl());
        media.setType(Media.MediaType.valueOf(request.getType().toUpperCase()));
        media.setDescription(request.getDescription());
        media.setCategory(request.getCategory());

        Media updated = mediaRepository.save(media);
        log.info("Updated media: {}", updated.getId());
        return toDTO(updated);
    }

    public void deleteMedia(Long id) {
        mediaRepository.deleteById(id);
        log.info("Deleted media: {}", id);
    }

    private MediaDTO toDTO(Media media) {
        return MediaDTO.builder()
                .id(media.getId())
                .title(media.getTitle())
                .url(media.getUrl())
                .type(media.getType().name())
                .description(media.getDescription())
                .category(media.getCategory())
                .uploadedBy(media.getUploadedBy())
                .createdAt(media.getCreatedAt())
                .updatedAt(media.getUpdatedAt())
                .build();
    }
}
