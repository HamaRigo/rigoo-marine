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
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MediaService {

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "video/mp4", "video/quicktime", "video/webm",
        "application/pdf"
    );
    private static final long MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

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
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("File type not allowed: " + contentType);
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new IllegalArgumentException("File exceeds maximum size of 20 MB");
        }

        // Create upload directory if it doesn't exist
        Path uploadPath = Path.of(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // UUID filename — no original filename used (prevents path traversal)
        String extension = switch (contentType) {
            case "image/jpeg"        -> ".jpg";
            case "image/png"         -> ".png";
            case "image/webp"        -> ".webp";
            case "image/gif"         -> ".gif";
            case "video/mp4"         -> ".mp4";
            case "video/quicktime"   -> ".mov";
            case "video/webm"        -> ".webm";
            case "application/pdf"   -> ".pdf";
            default                  -> "";
        };
        String filename = UUID.randomUUID().toString() + extension;
        Path filePath = uploadPath.resolve(filename);

        // Save file
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Determine media type
        Media.MediaType mediaType = determineMediaType(file.getContentType());

        // Create media record
        Media media = Media.builder()
                .title(title != null ? title : (file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload"))
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
                .active(media.getActive())
                .uploadedBy(media.getUploadedBy())
                .createdAt(media.getCreatedAt())
                .updatedAt(media.getUpdatedAt())
                .build();
    }
}
