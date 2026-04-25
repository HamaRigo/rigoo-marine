package com.rigoomarine.client.service;

import com.rigoomarine.client.dto.CreateMediaRequest;
import com.rigoomarine.client.dto.MediaDTO;
import com.rigoomarine.client.entity.Media;
import com.rigoomarine.client.repository.MediaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MediaService {

    private final MediaRepository mediaRepository;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${server.base-url:http://localhost:8081}")
    private String baseUrl;

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

    public MediaDTO uploadFile(MultipartFile file, String title, String category, Long uploadedBy) throws IOException {
        // Create upload directory if it doesn't exist
        Path uploadPath = Path.of(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
            ? originalFilename.substring(originalFilename.lastIndexOf("."))
            : "";
        String filename = UUID.randomUUID().toString() + extension;
        Path filePath = uploadPath.resolve(filename);

        // Save file
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Determine media type
        Media.MediaType mediaType = determineMediaType(file.getContentType());

        // Create media record
        Media media = Media.builder()
                .title(title != null ? title : originalFilename)
                .url("/uploads/" + filename)
                .type(mediaType)
                .description(category)
                .category(category)
                .uploadedBy(uploadedBy)
                .active(true)
                .build();

        Media saved = mediaRepository.save(media);
        log.info("Uploaded file: {}", saved.getUrl());
        return toDTO(saved);
    }

    private Media.MediaType determineMediaType(String contentType) {
        if (contentType == null) return Media.MediaType.OTHER;
        if (contentType.startsWith("image/")) return Media.MediaType.IMAGE;
        if (contentType.startsWith("video/")) return Media.MediaType.VIDEO;
        if (contentType.startsWith("application/")) return Media.MediaType.DOCUMENT;
        return Media.MediaType.OTHER;
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
