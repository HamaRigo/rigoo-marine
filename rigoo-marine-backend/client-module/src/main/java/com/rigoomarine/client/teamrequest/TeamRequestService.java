package com.rigoomarine.client.teamrequest;

import com.rigoomarine.client.entity.Client;
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
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private static final long MAX_FILE_BYTES = 20 * 1024 * 1024L;
    private static final int  MAX_FILES      = 5;

    private final TeamRequestRepository repository;
    private final ClientRepository      clientRepository;
    private final EmailTemplateService  emailTemplateService;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${app.admin-email:rigoomarine@gmail.com}")
    private String adminEmail;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    // ── Public: submit ────────────────────────────────────────────────────────

    /**
     * @param callerEmail  JWT subject (email) if the caller is authenticated, null for guests.
     * @param contactPhone Phone supplied by the caller. For authenticated users this is
     *                     overridden with the account's stored phone to prevent spoofing.
     */
    public TeamRequestDTO create(String callerEmail,
                                 String contactPhone,
                                 String category,
                                 String description,
                                 String locationDescription,
                                 boolean whatsappOptIn,
                                 List<MultipartFile> files) {

        validateFiles(files);

        // Resolve caller identity and canonicalize phone for authenticated users.
        Long clientId = null;
        if (callerEmail != null) {
            Client caller = clientRepository.findByEmail(callerEmail).orElse(null);
            if (caller != null) {
                clientId = caller.getId();
                // Override phone with the account's stored phone — prevents spoofing.
                if (caller.getPhone() != null && !caller.getPhone().isBlank()) {
                    contactPhone = caller.getPhone();
                }
            }
        }

        guardDuplicatePending(contactPhone, clientId);

        // Write files to disk BEFORE opening the DB transaction scope.
        // Collect paths so we can roll back on DB failure.
        List<String> storedPaths = new ArrayList<>();
        List<MultipartFile> validFiles = new ArrayList<>();
        if (files != null) {
            for (MultipartFile f : files) {
                if (f.isEmpty()) continue;
                storedPaths.add(storeFile(f));
                validFiles.add(f);
            }
        }

        try {
            TeamRequest req = TeamRequest.builder()
                .clientId(clientId)
                .contactPhone(contactPhone)
                .category(category)
                .description(description)
                .locationDescription(locationDescription)
                .whatsappOptIn(whatsappOptIn)
                .status(TeamRequestStatus.PENDING)
                .build();

            for (int i = 0; i < storedPaths.size(); i++) {
                MultipartFile f = validFiles.get(i);
                req.getAttachments().add(TeamRequestAttachment.builder()
                    .teamRequest(req)
                    .filePath(storedPaths.get(i))
                    .originalName(f.getOriginalFilename())
                    .contentType(f.getContentType())
                    .fileSize(f.getSize())
                    .build());
            }

            TeamRequest saved = repository.save(req);
            log.info("team-request.created id={} category={} phone={}", saved.getId(), category, mask(contactPhone));

            notifyAdminNewRequest(saved);
            return toDTO(saved);

        } catch (Exception e) {
            // DB save failed — roll back any files already written to disk.
            for (String path : storedPaths) {
                try {
                    Files.deleteIfExists(Paths.get(uploadDir, path));
                } catch (IOException ignored) {
                    log.warn("team-request.cleanup-failed path={}", path);
                }
            }
            throw e;
        }
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

    /**
     * Returns the caller's own team requests. Matches on clientId (primary) and
     * on contactPhone (fallback for pre-login guest submissions so they surface
     * after the guest creates an account with the same number).
     */
    @Transactional(readOnly = true)
    public Page<TeamRequestDTO> listForCaller(String callerEmail, Pageable pageable) {
        Client caller = clientRepository.findByEmail(callerEmail)
            .orElseThrow(() -> new IllegalArgumentException("Client not found: " + callerEmail));
        String phone = caller.getPhone() != null ? caller.getPhone() : "";
        return repository.findByClientIdOrContactPhone(caller.getId(), phone, pageable)
            .map(this::toDTO);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private void validateFiles(List<MultipartFile> files) {
        if (files == null) return;
        long nonEmpty = files.stream().filter(f -> !f.isEmpty()).count();
        if (nonEmpty > MAX_FILES) {
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

    private void guardDuplicatePending(String phone, Long clientId) {
        if (phone == null && clientId == null) return;

        if (phone != null) {
            repository.findPendingByPhone(phone, LocalDateTime.now().minusHours(24))
                .ifPresent(existing -> {
                    throw new IllegalStateException(
                        "A team request for this phone is already pending (id=" + existing.getId() + ")");
                });
        }
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
            // REPLACE_EXISTING guards against the astronomically rare UUID collision.
            Files.copy(file.getInputStream(), dir.resolve(name), StandardCopyOption.REPLACE_EXISTING);
            return "team-requests/" + name;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store attachment: " + file.getOriginalFilename(), e);
        }
    }

    private void notifyAdminNewRequest(TeamRequest req) {
        if (!mailEnabled) return;
        try {
            emailTemplateService.send("TEAM_REQUEST_NEW", adminEmail, "en",
                Map.of(
                    "requestId",   String.valueOf(req.getId()),
                    "category",    req.getCategory(),
                    "phone",       req.getContactPhone() != null ? req.getContactPhone() : "N/A",
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
                        "name",   client.getName(),
                        "status", req.getStatus().name(),
                        "notes",  req.getAdminNotes() != null ? req.getAdminNotes() : ""
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
