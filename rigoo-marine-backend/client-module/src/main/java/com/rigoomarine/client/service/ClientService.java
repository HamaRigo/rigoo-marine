package com.rigoomarine.client.service;

import com.rigoomarine.client.entity.Client;
import com.rigoomarine.client.repository.ClientRepository;
import com.rigoomarine.client.dto.ClientDTO;
import com.rigoomarine.client.dto.CreateClientRequest;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
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

@Service
@RequiredArgsConstructor
@Transactional
public class ClientService {

    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.rigoomarine.client.auth.PhoneNumberService phoneNumberService;

    @CacheEvict(value = "clients", allEntries = true)
    public ClientDTO createClient(CreateClientRequest request) {
        if (clientRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        String normalizedPhone = phoneNumberService.normalize(request.getPhone());
        if (clientRepository.existsByPhone(normalizedPhone)) {
            throw new RuntimeException("Phone already exists");
        }

        Client client = Client.builder()
            .name(request.getName())
            .email(request.getEmail())
            .phone(normalizedPhone)
            .password(passwordEncoder.encode(request.getPassword()))
            .role(request.getRole() != null ? Client.UserRole.valueOf(request.getRole()) : Client.UserRole.CLIENT)
            .address(request.getAddress())
            .company(request.getCompany())
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
            .orElseThrow(() -> new RuntimeException("Client not found"));
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "clients", key = "#email")
    public ClientDTO getClientByEmail(String email) {
        return clientRepository.findByEmail(email)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Client not found"));
    }

    /**
     * Used by login: caller normalizes phone first, then this resolves to the email
     * the AuthenticationManager / UserDetails service is keyed on.
     */
    @Transactional(readOnly = true)
    public java.util.Optional<String> findEmailByPhone(String normalizedPhone) {
        return clientRepository.findByPhone(normalizedPhone).map(Client::getEmail);
    }

    @CacheEvict(value = "clients", key = "#id")
    public ClientDTO updateClient(Long id, CreateClientRequest request) {
        Client client = clientRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Client not found"));

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

        Client updated = clientRepository.save(client);
        return toDTO(updated);
    }

    @CacheEvict(value = "clients", key = "#id")
    public ClientDTO updateClientWithPassword(Long id, CreateClientRequest request) {
        Client client = clientRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Client not found"));

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
        return toDTO(updated);
    }

    @CacheEvict(value = "clients", allEntries = true)
    public void deleteClient(Long id) {
        clientRepository.deleteById(id);
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
            .build();
    }
}
