package com.rigoomarine.client.teamrequest;

import com.rigoomarine.client.mail.EmailTemplateService;
import com.rigoomarine.client.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TeamRequestService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/heic",
        "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"
    );
    private static final long MAX_FILE_BYTES = 20 * 1024 * 1024L; // 20 MB
    private static final int  MAX_FILES = 5;

    private final TeamRequestRepository repository;
    private final ClientRepository clientRepository;
    private final EmailTemplateService emailTemplateService;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${app.admin-email:rigoomarine@gmail.com}")
    private String adminEmail;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    // ── Public: submit a team request ────────────────────────────────────────

    public TeamRequestDTO create(Long clientId,
                                 String contactPhone,
                                 String category,
                                 String description,
                                 String locationDescription,
                                 boolean whatsappOptIn,
                                 List<MultipartFile> files) {

        validateFiles(files);
        guardDuplicatePending(contactPhone);

        TeamRequest req = TeamRequest.builder()
            .clientId(clientId)
            .contactPhone(contactPhone)
            .category(category)
            .description(description)
            .locationDescription(locationDescription)
            .whatsappOptIn(whatsappOptIn)
            .status(TeamRequestStatus.PENDING)
            .build();

        if (files != null) {
            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;
                String path = storeFile(file);
                req.getAttachments().add(TeamRequestAttachment.builder()
                    .teamRequest(req)
                    .filePath(path)
                    .originalName(file.getOriginalFilename())
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .build());
            }
        }

        TeamRequest saved = repository.save(req);
        log.info("team-request.created id={} category={} phone={}", saved.getId(), category, mask(contactPhone));

        notifyAdminNewRequest(saved);
        return toDTO(saved);
    }

    // ── Admin: list + status update ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<TeamRequestDTO> list(TeamRequestStatus status, Pageable pageable) {
        Page<TeamRequest> page = status != null
            ? repository.findByStatusOrderByCreatedAtDesc(status, pageable)
            : repository.findAllByOrderByCreatedAtDesc(pageable);
        return page.map(this::toDTO);
    }

    public TeamRequestDTO updateStatus(Long id, TeamRequestStatus newStatus, String adminNotes) {
        TeamRequest req = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Team request not found: " + id));

        TeamRequestStatus prev = req.getStatus();
        req.setStatus(newStatus);
        if (adminNotes != null && !adminNotes.isBlank()) {
            req.setAdminNotes(adminNotes);
        }
        TeamRequest saved = repository.save(req);

        log.info("team-request.status id={} {}→{}", id, prev, newStatus);
        notifyClientStatusChange(saved);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public long countPending() {
        return repository.countByStatus(TeamRequestStatus.PENDING);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private void validateFiles(List<MultipartFile> files) {
        if (files == null) return;
        if (files.size() > MAX_FILES) {
            throw new IllegalArgumentException("Maximum " + MAX_FILES + " files allowed");
        }
        for (MultipartFile f : files) {
            if (f.isEmpty()) continue;
            if (f.getSize() > MAX_FILE_BYTES) {
                throw new IllegalArgumentException("File '" + f.getOriginalFilename() + "' exceeds 20 MB limit");
            }
            if (!ALLOWED_TYPES.contains(f.getContentType())) {
                throw new IllegalArgumentException("File type '" + f.getContentType() + "' is not allowed");
            }
        }
    }

    private void guardDuplicatePending(String phone) {
        if (phone == null) return;
        repository.findPendingByPhone(phone, LocalDateTime.now().minusHours(24))
            .ifPresent(existing -> {
                throw new IllegalStateException(
                    "A team request for this phone is already pending (id=" + existing.getId() + ")");
            });
    }

    private String storeFile(MultipartFile file) {
        try {
            Path dir = Paths.get(uploadDir, "team-requests");
            Files.createDirectories(dir);
            String ext = "";
            String original = file.getOriginalFilename();
            if (original != null && original.contains(".")) {
                ext = original.substring(original.lastIndexOf('.'));
            }
            String name = UUID.randomUUID() + ext;
            Files.copy(file.getInputStream(), dir.resolve(name));
            return "team-requests/" + name;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store attachment", e);
        }
    }

    private void notifyAdminNewRequest(TeamRequest req) {
        if (!mailEnabled) return;
        try {
            emailTemplateService.send("TEAM_REQUEST_NEW", adminEmail, "en",
                Map.of(
                    "requestId",  String.valueOf(req.getId()),
                    "category",   req.getCategory(),
                    "phone",      req.getContactPhone() != null ? req.getContactPhone() : "N/A",
                    "description", req.getDescription()
                ));
        } catch (Exception e) {
            log.warn("team-request.admin-notify-failed id={} err={}", req.getId(), e.getMessage());
        }
    }

    private void notifyClientStatusChange(TeamRequest req) {
        if (!mailEnabled || req.getContactPhone() == null) return;
        clientRepository.findByPhone(req.getContactPhone()).ifPresent(client -> {
            try {
                emailTemplateService.send("TEAM_REQUEST_STATUS", client.getEmail(),
                    client.getPreferredLanguage() != null ? client.getPreferredLanguage() : "en",
                    Map.of(
                        "name",    client.getName(),
                        "status",  req.getStatus().name(),
                        "notes",   req.getAdminNotes() != null ? req.getAdminNotes() : ""
                    ));
            } catch (Exception e) {
                log.warn("team-request.client-notify-failed id={} err={}", req.getId(), e.getMessage());
            }
        });
    }

    private TeamRequestDTO toDTO(TeamRequest r) {
        return new TeamRequestDTO(
            r.getId(),
            r.getClientId(),
            r.getContactPhone(),
            r.getCategory(),
            r.getDescription(),
            r.getLocationDescription(),
            r.isWhatsappOptIn(),
            r.getStatus().name(),
            r.getAdminNotes(),
            r.getAttachments().stream().map(a -> new TeamRequestDTO.AttachmentDTO(
                a.getId(), a.getOriginalName(), a.getContentType(), a.getFileSize()
            )).toList(),
            r.getCreatedAt(),
            r.getUpdatedAt()
        );
    }

    private static String mask(String phone) {
        if (phone == null || phone.length() < 6) return "<short>";
        return phone.substring(0, 4) + "****" + phone.substring(phone.length() - 3);
    }
}
