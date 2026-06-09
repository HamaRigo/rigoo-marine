package com.rigoomarine.client.service;
import com.rigoomarine.client.entity.Client;
import com.rigoomarine.client.exception.ClientNotFoundException;
import com.rigoomarine.client.repository.ClientRepository;
import com.rigoomarine.client.dto.ClientDTO;
import com.rigoomarine.client.dto.CreateClientRequest;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ClientService {

    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.rigoomarine.client.auth.PhoneNumberService phoneNumberService;
    private final CacheManager cacheManager;

    // Evict only the 'all' list — individual-client entries don't exist yet.
    @CacheEvict(value = "clients", key = "'all'")
    public ClientDTO createClient(CreateClientRequest request) {
        return createClient(request, false);
    }

    public ClientDTO createClient(CreateClientRequest request, boolean autoVerifyEmail) {
        if (clientRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        String normalizedPhone = phoneNumberService.normalize(request.getPhone());
        if (clientRepository.existsByPhone(normalizedPhone)) {
            throw new IllegalArgumentException("Phone already exists");
        }

        Client client = Client.builder()
            .name(request.getName())
            .email(request.getEmail())
            .phone(normalizedPhone)
            .password(passwordEncoder.encode(request.getPassword()))
            .role(request.getRole() != null ? Client.UserRole.valueOf(request.getRole()) : Client.UserRole.CLIENT)
            .address(request.getAddress())
            .company(request.getCompany())
            .emailVerified(autoVerifyEmail)
            .preferredLanguage(normaliseLanguage(request.getPreferredLanguage()))
            .build();

        Client saved = clientRepository.save(client);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "clients", key = "'all'")
    public List<ClientDTO> getAllClients() {
        return clientRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ClientDTO> getClientsByRole(String role) {
        return clientRepository.findByRole(Client.UserRole.valueOf(role)).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    /**
     * Filterable + paginated client list for the admin user-management table.
     * @param q         free-text matched against name + email + phone (case-insensitive)
     * @param role      exact match on UserRole (CLIENT | ADMIN | TECHNICIAN)
     * @param verified  email_verified flag (null = both)
     */
    @Transactional(readOnly = true)
    public Page<ClientDTO> searchPaged(String q, String role, Boolean verified, Pageable pageable) {
        Specification<Client> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("email")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("phone"), "")), like)
                ));
            }
            if (role != null && !role.isBlank()) {
                predicates.add(cb.equal(root.get("role"), Client.UserRole.valueOf(role)));
            }
            if (verified != null) {
                predicates.add(cb.equal(root.get("emailVerified"), verified));
            }
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return clientRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "clients", key = "#id")
    public ClientDTO getClientById(Long id) {
        return clientRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new ClientNotFoundException(id));
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "clients", key = "#email")
    public ClientDTO getClientByEmail(String email) {
        return clientRepository.findByEmail(email)
            .map(this::toDTO)
            .orElseThrow(() -> new ClientNotFoundException(email));
    }

    /**
     * Used by login: caller normalizes phone first, then this resolves to the email
     * the AuthenticationManager / UserDetails service is keyed on.
     */
    @Transactional(readOnly = true)
    public java.util.Optional<String> findEmailByPhone(String normalizedPhone) {
        return clientRepository.findByPhone(normalizedPhone).map(Client::getEmail);
    }

    public ClientDTO updateClient(Long id, CreateClientRequest request) {
        Client client = clientRepository.findById(id)
            .orElseThrow(() -> new ClientNotFoundException(id));
        String oldEmail = client.getEmail(); // capture before mutation

        client.setName(request.getName());
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String normalizedPhone = phoneNumberService.normalize(request.getPhone());
            if (!normalizedPhone.equals(client.getPhone())
                    && clientRepository.existsByPhone(normalizedPhone)) {
                throw new RuntimeException("Phone already exists");
            }
            client.setPhone(normalizedPhone);
        }
        client.setAddress(request.getAddress());
        client.setCompany(request.getCompany());

        if (request.getRole() != null) {
            client.setRole(Client.UserRole.valueOf(request.getRole()));
        }

        // Profile may omit preferredLanguage on submit; preserve the existing
        // value unless the caller explicitly sent a new one. Normalised below
        // so only languages with templates can ever land in the column.
        if (request.getPreferredLanguage() != null) {
            client.setPreferredLanguage(normaliseLanguage(request.getPreferredLanguage()));
        }
        // Same partial-update guard for WhatsApp opt-in.
        if (request.getWhatsappOptIn() != null) {
            client.setWhatsappOptIn(request.getWhatsappOptIn());
        }

        Client updated = clientRepository.save(client);
        evictClientCaches(id, oldEmail);
        return toDTO(updated);
    }

    /**
     * Two languages are wired up today (EN/AR templates exist for both).
     * Anything else collapses to "en" so a typo from the frontend doesn't
     * land a row that breaks every future template lookup.
     */
    private static String normaliseLanguage(String lang) {
        if (lang == null) return "en";
        String lower = lang.trim().toLowerCase();
        return "ar".equals(lower) ? "ar" : "en";
    }

    public ClientDTO updateClientWithPassword(Long id, CreateClientRequest request) {
        Client client = clientRepository.findById(id)
            .orElseThrow(() -> new ClientNotFoundException(id));
        String oldEmail = client.getEmail();

        client.setName(request.getName());
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String normalizedPhone = phoneNumberService.normalize(request.getPhone());
            if (!normalizedPhone.equals(client.getPhone())
                    && clientRepository.existsByPhone(normalizedPhone)) {
                throw new RuntimeException("Phone already exists");
            }
            client.setPhone(normalizedPhone);
        }
        client.setAddress(request.getAddress());
        client.setCompany(request.getCompany());

        if (request.getRole() != null) {
            client.setRole(Client.UserRole.valueOf(request.getRole()));
        }

        if (request.getPassword() != null) {
            client.setPassword(passwordEncoder.encode(request.getPassword()));
            client.setPasswordChangedAt(java.time.LocalDateTime.now());
        }

        Client updated = clientRepository.save(client);
        evictClientCaches(id, oldEmail);
        return toDTO(updated);
    }

    public void deleteClient(Long id) {
        String email = clientRepository.findById(id).map(Client::getEmail).orElse(null);
        clientRepository.deleteById(id);
        evictClientCaches(id, email);
        try {
            Cache cache = cacheManager.getCache("clients");
            if (cache != null) cache.evict("all");
        } catch (RuntimeException ex) {
            log.warn("cache.evict_error context=deleteClient id={} cause={}", id, ex.toString());
        }
    }

    // Silent: a Redis failure must never surface as a 500 to the caller.
    private void evictClientCaches(Long id, String email) {
        try {
            Cache cache = cacheManager.getCache("clients");
            if (cache == null) return;
            cache.evict(id);
            if (email != null) cache.evict(email);
        } catch (RuntimeException ex) {
            log.warn("cache.evict_error context=client id={} cause={}", id, ex.toString());
        }
    }

    private ClientDTO toDTO(Client client) {
        return ClientDTO.builder()
            .id(client.getId())
            .name(client.getName())
            .email(client.getEmail())
            .phone(client.getPhone())
            .role(client.getRole().name())
            .address(client.getAddress())
            .company(client.getCompany())
            .createdAt(client.getCreatedAt())
            .emailVerified(Boolean.TRUE.equals(client.getEmailVerified()))
            .passwordChangedAt(client.getPasswordChangedAt())
            .preferredLanguage(client.getPreferredLanguage() == null ? "en" : client.getPreferredLanguage())
            .whatsappOptIn(Boolean.TRUE.equals(client.getWhatsappOptIn()))
            .build();
    }
}
