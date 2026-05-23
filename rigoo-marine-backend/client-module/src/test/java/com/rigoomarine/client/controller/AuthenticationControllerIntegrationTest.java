package com.rigoomarine.client.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rigoomarine.client.dto.CreateClientRequest;
import com.rigoomarine.client.repository.ClientRepository;
import com.rigoomarine.client.entity.Client;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthenticationControllerIntegrationTest {

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

    @Autowired(required = false)
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    private String authToken;

    @BeforeEach
    void setUp() {
        clientRepository.deleteAll();
        // Clear rate limiter Redis keys so registration tests are idempotent across runs.
        if (redisTemplate != null) {
            Set<String> keys = redisTemplate.keys("register:rate:*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        }
    }

    @Test
    void register_ShouldCreateUserAndReturnToken() throws Exception {
        CreateClientRequest request = CreateClientRequest.builder()
                .name("Test User")
                .email("test@example.com")
                .phone("+97466000001")
                .password("password123")
                .role("CLIENT")
                .build();

        String responseContent = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("test@example.com"))
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.expiresAt").exists())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Map<String, Object> response = objectMapper.readValue(responseContent, Map.class);
        assertNotNull(response.get("token"));
    }

    @Test
    void register_ShouldFail_WhenEmailExists() throws Exception {
        CreateClientRequest request = CreateClientRequest.builder()
                .name("Test User")
                .email("duplicate@example.com")
                .phone("+97455000002")
                .password("password123")
                .build();

        // First registration
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Duplicate registration
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void login_ShouldReturnToken_WhenCredentialsValid() throws Exception {
        // Create user first
        Client client = Client.builder()
                .name("Login User")
                .email("login@example.com")
                .phone("1234567890")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.CLIENT)
                .build();
        clientRepository.save(client);

        Map<String, String> credentials = Map.of(
                "email", "login@example.com",
                "password", "password123"
        );

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("login@example.com"))
                .andExpect(jsonPath("$.token").exists());
    }

    @Test
    void login_ShouldFail_WhenCredentialsInvalid() throws Exception {
        Map<String, String> credentials = Map.of(
                "email", "nonexistent@example.com",
                "password", "wrongpassword"
        );

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getProfile_ShouldReturnUserProfile_WhenAuthenticated() throws Exception {
        // Create user and get token
        Client client = Client.builder()
                .name("Profile User")
                .email("profile@example.com")
                .phone("1234567890")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.CLIENT)
                .build();
        clientRepository.save(client);

        String token = jwtTokenProvider.generateToken("profile@example.com", "CLIENT");

        mockMvc.perform(get("/api/auth/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("profile@example.com"));
    }

    @Test
    void getProfile_ShouldFail_WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateProfile_ShouldUpdateUser_WhenAuthenticated() throws Exception {
        Client client = Client.builder()
                .name("Update User")
                .email("update@example.com")
                .phone("1234567890")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.CLIENT)
                .build();
        clientRepository.save(client);

        String token = jwtTokenProvider.generateToken("update@example.com", "CLIENT");

        Map<String, String> updates = Map.of(
                "name", "Updated Name",
                "phone", "+97466000007",
                "company", "New Company"
        );

        mockMvc.perform(put("/api/auth/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updates)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.name").value("Updated Name"))
                .andExpect(jsonPath("$.user.phone").value("+97466000007"))
                .andExpect(jsonPath("$.user.company").value("New Company"));
    }

    @Test
    void logout_ShouldReturnSuccess_WhenAuthenticated() throws Exception {
        Client client = Client.builder()
                .name("Logout User")
                .email("logout@example.com")
                .phone("1234567890")
                .password(passwordEncoder.encode("password123"))
                .role(Client.UserRole.CLIENT)
                .build();
        clientRepository.save(client);

        String token = jwtTokenProvider.generateToken("logout@example.com", "CLIENT");

        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Logged out"));
    }

    @Test
    void register_ShouldFail_WhenMissingRequiredFields() throws Exception {
        CreateClientRequest request = CreateClientRequest.builder()
                .name("")  // Empty name
                .email("invalid-email")  // Invalid email
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").exists());
    }
}
