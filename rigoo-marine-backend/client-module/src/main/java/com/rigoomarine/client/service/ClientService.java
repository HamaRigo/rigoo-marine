package com.rigoomarine.client.service;

import com.rigoomarine.client.entity.Client;
import com.rigoomarine.client.repository.ClientRepository;
import com.rigoomarine.client.dto.ClientDTO;
import com.rigoomarine.client.dto.CreateClientRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ClientService {

    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;

    public ClientDTO createClient(CreateClientRequest request) {
        if (clientRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        Client client = Client.builder()
            .name(request.getName())
            .email(request.getEmail())
            .phone(request.getPhone())
            .password(passwordEncoder.encode(request.getPassword()))
            .role(request.getRole() != null ? Client.UserRole.valueOf(request.getRole()) : Client.UserRole.CLIENT)
            .address(request.getAddress())
            .company(request.getCompany())
            .build();

        Client saved = clientRepository.save(client);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<ClientDTO> getAllClients() {
        return clientRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ClientDTO getClientById(Long id) {
        return clientRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Client not found"));
    }

    @Transactional(readOnly = true)
    public ClientDTO getClientByEmail(String email) {
        return clientRepository.findByEmail(email)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Client not found"));
    }

    public ClientDTO updateClient(Long id, CreateClientRequest request) {
        Client client = clientRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Client not found"));

        client.setName(request.getName());
        client.setPhone(request.getPhone());
        client.setAddress(request.getAddress());
        client.setCompany(request.getCompany());

        if (request.getRole() != null) {
            client.setRole(Client.UserRole.valueOf(request.getRole()));
        }

        Client updated = clientRepository.save(client);
        return toDTO(updated);
    }

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
            .build();
    }
}
