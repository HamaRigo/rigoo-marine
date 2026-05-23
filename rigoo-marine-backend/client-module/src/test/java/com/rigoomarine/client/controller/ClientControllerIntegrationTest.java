package com.rigoomarine.client.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rigoomarine.client.dto.CreateClientRequest;
import com.rigoomarine.client.entity.Client;
import com.rigoomarine.client.repository.ClientRepository;
import com.rigoomarine.client.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ClientControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String authToken;

    @BeforeEach
    void setUp() {
        clientRepository.deleteAll();

        // Create admin user for authentication
        Client admin = Client.builder()
                .name("Admin User")
                .email("admin@example.com")
                .phone("1234567890")
                .password(passwordEncoder.encode("admin123"))
                .role(Client.UserRole.ADMIN)
                .build();
        clientRepository.save(admin);

        authToken = jwtTokenProvider.generateToken("admin@example.com", "ADMIN");
    }

    @Test
    void createClient_ShouldCreateClient_WhenAuthenticated() throws Exception {
        CreateClientRequest request = CreateClientRequest.builder()
                .name("New Client")
                .email("newclient@example.com")
                .phone("+97466000003")
                .password("password123")
                .role("CLIENT")
                .build();

        mockMvc.perform(post("/api/clients")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("newclient@example.com"))
                .andExpect(jsonPath("$.name").value("New Client"));
    }

    @Test
    void getAllClients_ShouldReturnListOfClients_WhenAuthenticated() throws Exception {
        // Create some clients
        Client client1 = Client.builder()
                .name("Client 1")
                .email("client1@example.com")
                .phone("1111111111")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.CLIENT)
                .build();
        clientRepository.save(client1);

        Client client2 = Client.builder()
                .name("Client 2")
                .email("client2@example.com")
                .phone("2222222222")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.CLIENT)
                .build();
        clientRepository.save(client2);

        mockMvc.perform(get("/api/clients")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3)); // admin + 2 clients
    }

    @Test
    void getClientById_ShouldReturnClient_WhenExists() throws Exception {
        Client client = Client.builder()
                .name("Get Client")
                .email("getclient@example.com")
                .phone("9111111111")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.CLIENT)
                .build();
        Client saved = clientRepository.save(client);

        mockMvc.perform(get("/api/clients/{id}", saved.getId())
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("getclient@example.com"));
    }

    @Test
    void getClientById_ShouldReturnNotFound_WhenNotExists() throws Exception {
        mockMvc.perform(get("/api/clients/{id}", 999L)
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void updateClient_ShouldUpdateClient_WhenExists() throws Exception {
        Client client = Client.builder()
                .name("Update Client")
                .email("updateclient@example.com")
                .phone("9222222222")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.CLIENT)
                .build();
        Client saved = clientRepository.save(client);

        CreateClientRequest updateRequest = CreateClientRequest.builder()
                .name("Updated Name")
                .email("updatedemail@example.com")
                .phone("+97466000004")
                .password("newpassword")
                .role("CLIENT")
                .address("New Address")
                .company("New Company")
                .build();

        mockMvc.perform(put("/api/clients/{id}", saved.getId())
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"))
                .andExpect(jsonPath("$.phone").value("+97466000004"))
                .andExpect(jsonPath("$.company").value("New Company"));
    }

    @Test
    void deleteClient_ShouldDeleteClient_WhenExists() throws Exception {
        Client client = Client.builder()
                .name("Delete Client")
                .email("deleteclient@example.com")
                .phone("9333333333")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.CLIENT)
                .build();
        Client saved = clientRepository.save(client);

        mockMvc.perform(delete("/api/clients/{id}", saved.getId())
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isNoContent());

        // Verify deletion
        mockMvc.perform(get("/api/clients/{id}", saved.getId())
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void clientsEndpoints_ShouldFail_WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/clients"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
