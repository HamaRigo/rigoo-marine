package com.rigoomarine.client.controller;

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
class AdminControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String adminToken;

    @BeforeEach
    void setUp() {
        clientRepository.deleteAll();

        // Create admin user
        Client admin = Client.builder()
                .name("Admin User")
                .email("admin@example.com")
                .phone("+97466100001")
                .password(passwordEncoder.encode("admin123"))
                .role(Client.UserRole.ADMIN)
                .build();
        clientRepository.save(admin);

        // Create some test users
        Client client1 = Client.builder()
                .name("Test Client")
                .email("client@example.com")
                .phone("+97466100002")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.CLIENT)
                .build();
        clientRepository.save(client1);

        Client technician = Client.builder()
                .name("Test Technician")
                .email("technician@example.com")
                .phone("+97466100003")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.TECHNICIAN)
                .build();
        clientRepository.save(technician);

        adminToken = jwtTokenProvider.generateToken("admin@example.com", "ADMIN");
    }

    @Test
    void getDashboardStats_ShouldReturnStats_WhenAdmin() throws Exception {
        mockMvc.perform(get("/admin/dashboard/stats")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(3))
                .andExpect(jsonPath("$.adminCount").value(1))
                .andExpect(jsonPath("$.technicianCount").value(1))
                .andExpect(jsonPath("$.clientCount").value(1));
    }

    @Test
    void getAllUsers_ShouldReturnListOfUsers_WhenAdmin() throws Exception {
        mockMvc.perform(get("/admin/users/all")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void getUserById_ShouldReturnUser_WhenExists() throws Exception {
        Client client = clientRepository.findByEmail("client@example.com").orElseThrow();

        mockMvc.perform(get("/admin/users/{id}", client.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("client@example.com"));
    }

    @Test
    void updateUserRole_ShouldUpdateRole_WhenValidRole() throws Exception {
        Client client = clientRepository.findByEmail("client@example.com").orElseThrow();

        Map<String, String> roleUpdate = Map.of("role", "ADMIN");

        mockMvc.perform(put("/admin/users/{id}/role", client.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\": \"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void updateUserRole_ShouldFail_WhenInvalidRole() throws Exception {
        Client client = clientRepository.findByEmail("client@example.com").orElseThrow();

        mockMvc.perform(put("/admin/users/{id}/role", client.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\": \"INVALID_ROLE\"}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void deleteUser_ShouldDeleteUser_WhenExists() throws Exception {
        Client client = clientRepository.findByEmail("client@example.com").orElseThrow();

        mockMvc.perform(delete("/admin/users/{id}", client.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // Verify deletion
        mockMvc.perform(get("/admin/users/{id}", client.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void adminEndpoints_ShouldFail_WhenNotAdmin() throws Exception {
        // Create non-admin token
        String clientToken = jwtTokenProvider.generateToken("client@example.com", "CLIENT");

        mockMvc.perform(get("/admin/dashboard/stats")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/admin/users")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpoints_ShouldFail_WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/admin/dashboard/stats"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllOrders_ShouldReturnError_WhenEndpointRemoved() throws Exception {
        // Spring MVC 6 / Boot 3 throws NoResourceFoundException → 404 (not 500)
        // when no handler is registered for a path.
        mockMvc.perform(get("/admin/orders")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void getAllServices_ShouldReturnError_WhenEndpointRemoved() throws Exception {
        // Spring MVC 6 / Boot 3 throws NoResourceFoundException → 404 (not 500)
        // when no handler is registered for a path.
        mockMvc.perform(get("/admin/services")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }
}
