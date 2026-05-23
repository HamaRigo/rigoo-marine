package com.rigoomarine.client.service;

import com.rigoomarine.client.auth.PhoneNumberService;
import com.rigoomarine.client.dto.ClientDTO;
import com.rigoomarine.client.dto.CreateClientRequest;
import com.rigoomarine.client.entity.Client;
import com.rigoomarine.client.repository.ClientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClientServiceTest {

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private PhoneNumberService phoneNumberService;

    @InjectMocks
    private ClientService clientService;

    private CreateClientRequest createRequest;
    private Client client;

    @BeforeEach
    void setUp() {
        createRequest = CreateClientRequest.builder()
                .name("John Doe")
                .email("john@example.com")
                .phone("1234567890")
                .password("password123")
                .role("CLIENT")
                .address("123 Main St")
                .company("Test Corp")
                .build();

        client = Client.builder()
                .id(1L)
                .name("John Doe")
                .email("john@example.com")
                .phone("1234567890")
                .password("encodedPassword")
                .role(Client.UserRole.CLIENT)
                .address("123 Main St")
                .company("Test Corp")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void createClient_ShouldReturnClientDTO_WhenEmailNotExists() {
        when(phoneNumberService.normalize(createRequest.getPhone())).thenReturn(createRequest.getPhone());
        when(clientRepository.existsByEmail(createRequest.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(createRequest.getPassword())).thenReturn("encodedPassword");
        when(clientRepository.save(any(Client.class))).thenReturn(client);

        ClientDTO result = clientService.createClient(createRequest);

        assertNotNull(result);
        assertEquals("john@example.com", result.getEmail());
        assertEquals("John Doe", result.getName());
        verify(clientRepository).save(any(Client.class));
    }

    @Test
    void createClient_ShouldThrowException_WhenEmailExists() {
        when(clientRepository.existsByEmail(createRequest.getEmail())).thenReturn(true);

        assertThrows(RuntimeException.class, () -> clientService.createClient(createRequest));
        verify(clientRepository, never()).save(any(Client.class));
    }

    @Test
    void getClientById_ShouldReturnClientDTO_WhenClientExists() {
        when(clientRepository.findById(1L)).thenReturn(Optional.of(client));

        ClientDTO result = clientService.getClientById(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("john@example.com", result.getEmail());
    }

    @Test
    void getClientById_ShouldThrowException_WhenClientNotFound() {
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> clientService.getClientById(99L));
    }

    @Test
    void getClientByEmail_ShouldReturnClientDTO_WhenClientExists() {
        when(clientRepository.findByEmail("john@example.com")).thenReturn(Optional.of(client));

        ClientDTO result = clientService.getClientByEmail("john@example.com");

        assertNotNull(result);
        assertEquals("john@example.com", result.getEmail());
    }

    @Test
    void getClientByEmail_ShouldThrowException_WhenClientNotFound() {
        when(clientRepository.findByEmail("notfound@example.com")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
            clientService.getClientByEmail("notfound@example.com"));
    }

    @Test
    void deleteClient_ShouldCallRepositoryDelete() {
        clientService.deleteClient(1L);
        verify(clientRepository).deleteById(1L);
    }
}
