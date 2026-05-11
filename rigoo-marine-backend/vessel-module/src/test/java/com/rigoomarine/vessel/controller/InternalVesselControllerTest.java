package com.rigoomarine.vessel.controller;

import com.rigoomarine.vessel.entity.Vessel;
import com.rigoomarine.vessel.repository.VesselRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Transactional
class InternalVesselControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private VesselRepository vesselRepository;

    @Value("${internal.api-token}")
    private String token;

    private Long savedVesselId;

    @BeforeEach
    void setUp() {
        vesselRepository.deleteAll();
        Vessel saved = vesselRepository.save(Vessel.builder()
            .name("Internal Test Vessel")
            .type("Yacht")
            .length("20.0")
            .clientId(42L)
            .build());
        savedVesselId = saved.getId();
    }

    @Test
    void ownership_returns204_whenOwned() throws Exception {
        mockMvc.perform(get("/api/internal/vessels/{id}/ownership", savedVesselId)
                        .param("clientId", "42")
                        .header("X-Internal-Api-Token", token))
                .andExpect(status().isNoContent());
    }

    @Test
    void ownership_returns404_whenNotOwned() throws Exception {
        mockMvc.perform(get("/api/internal/vessels/{id}/ownership", savedVesselId)
                        .param("clientId", "99")
                        .header("X-Internal-Api-Token", token))
                .andExpect(status().isNotFound());
    }

    @Test
    void ownership_returns404_whenVesselMissing() throws Exception {
        mockMvc.perform(get("/api/internal/vessels/{id}/ownership", 999999L)
                        .param("clientId", "42")
                        .header("X-Internal-Api-Token", token))
                .andExpect(status().isNotFound());
    }

    @Test
    void ownership_returns401_whenTokenMissing() throws Exception {
        mockMvc.perform(get("/api/internal/vessels/{id}/ownership", savedVesselId)
                        .param("clientId", "42"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ownership_returns401_whenTokenWrong() throws Exception {
        mockMvc.perform(get("/api/internal/vessels/{id}/ownership", savedVesselId)
                        .param("clientId", "42")
                        .header("X-Internal-Api-Token", "wrong"))
                .andExpect(status().isUnauthorized());
    }
}
