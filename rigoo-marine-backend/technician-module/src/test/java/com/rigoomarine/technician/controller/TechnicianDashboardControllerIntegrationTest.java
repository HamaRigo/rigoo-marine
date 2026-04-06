package com.rigoomarine.technician.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rigoomarine.technician.dto.TechnicianDTO;
import com.rigoomarine.technician.entity.Technician;
import com.rigoomarine.technician.repository.TechnicianRepository;
import com.rigoomarine.technician.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
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
class TechnicianDashboardControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TechnicianRepository technicianRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String technicianToken;

    @BeforeEach
    void setUp() {
        technicianRepository.deleteAll();

        // Create technician user (note: this is a simplified test without full auth setup)
        Technician technician = Technician.builder()
                .name("Test Technician")
                .email("technician@example.com")
                .phone("1234567890")
                .specialization("Engine Repair")
                .certification("Certified Marine Technician")
                .available(true)
                .experienceYears(5)
                .build();
        technicianRepository.save(technician);

        // For this test, we'll use a token generated for testing
        // In real scenario, technician would authenticate first
        technicianToken = jwtTokenProvider.generateToken("technician@example.com", "TECHNICIAN");
    }

    @Test
    void getDashboardStats_ShouldReturnStats_WhenAuthenticated() throws Exception {
        mockMvc.perform(get("/technician/dashboard/stats")
                        .header("Authorization", "Bearer " + technicianToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTechnicians").value(1))
                .andExpect(jsonPath("$.availableTechnicians").value(1));
    }

    @Test
    void getMyOrders_ShouldReturnEmptyList_WhenNoOrders() throws Exception {
        mockMvc.perform(get("/technician/orders")
                        .header("Authorization", "Bearer " + technicianToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getOrderById_ShouldReturnOrderDetails() throws Exception {
        mockMvc.perform(get("/technician/orders/{id}", 1L)
                        .header("Authorization", "Bearer " + technicianToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void updateStatus_ShouldUpdateOrderStatus() throws Exception {
        Map<String, String> statusUpdate = Map.of("status", "IN_PROGRESS");

        mockMvc.perform(patch("/technician/orders/{id}/status", 1L)
                        .header("Authorization", "Bearer " + technicianToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    void addNote_ShouldAddNoteToOrder() throws Exception {
        Map<String, String> noteData = Map.of("content", "Test note content");

        mockMvc.perform(post("/technician/orders/{id}/notes", 1L)
                        .header("Authorization", "Bearer " + technicianToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(noteData)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Test note content"));
    }

    @Test
    void addTimeEntry_ShouldAddTimeEntryToOrder() throws Exception {
        Map<String, Object> timeEntry = Map.of(
                "duration", 120,
                "activity", "Engine inspection"
        );

        mockMvc.perform(post("/technician/orders/{id}/time-entries", 1L)
                        .header("Authorization", "Bearer " + technicianToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(timeEntry)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duration").value(120))
                .andExpect(jsonPath("$.activity").value("Engine inspection"));
    }

    @Test
    void getWorkHistory_ShouldReturnEmptyList_WhenNoHistory() throws Exception {
        mockMvc.perform(get("/technician/history")
                        .header("Authorization", "Bearer " + technicianToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void technicianEndpoints_ShouldFail_WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/technician/dashboard/stats"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/technician/orders"))
                .andExpect(status().isUnauthorized());
    }
}
