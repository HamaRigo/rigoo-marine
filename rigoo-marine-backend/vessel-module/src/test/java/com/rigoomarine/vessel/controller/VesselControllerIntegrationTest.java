package com.rigoomarine.vessel.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rigoomarine.vessel.dto.CreateVesselRequest;
import com.rigoomarine.vessel.entity.Vessel;
import com.rigoomarine.vessel.repository.VesselRepository;
import com.rigoomarine.common.security.AuthenticatedUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Transactional
class VesselControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private VesselRepository vesselRepository;

    @BeforeEach
    void setUp() {
        vesselRepository.deleteAll();
        AuthenticatedUser principal = new AuthenticatedUser(
            "admin@test.local", 1L, List.of("ROLE_ADMIN"));
        var auth = new UsernamePasswordAuthenticationToken(
            principal, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createVessel_ShouldCreateVessel() throws Exception {
        CreateVesselRequest request = CreateVesselRequest.builder()
                .name("Test Vessel")
                .type("Yacht")
                .length("25.5")
                .clientId(1L)
                .build();

        mockMvc.perform(post("/api/vessels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Vessel"))
                .andExpect(jsonPath("$.type").value("Yacht"))
                .andExpect(jsonPath("$.clientId").value(1));
    }

    @Test
    void getVesselsByClientId_ShouldReturnListOfVessels() throws Exception {
        Vessel vessel1 = Vessel.builder()
                .name("Vessel 1")
                .type("Yacht")
                .length("20.0")
                .clientId(1L)
                .build();
        vesselRepository.save(vessel1);

        Vessel vessel2 = Vessel.builder()
                .name("Vessel 2")
                .type("Catamaran")
                .length("30.0")
                .clientId(1L)
                .build();
        vesselRepository.save(vessel2);

        mockMvc.perform(get("/api/vessels/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void getVesselById_ShouldReturnVessel_WhenExists() throws Exception {
        Vessel vessel = Vessel.builder()
                .name("Get Vessel")
                .type("Yacht")
                .length("25.0")
                .clientId(1L)
                .build();
        Vessel saved = vesselRepository.save(vessel);

        mockMvc.perform(get("/api/vessels/{id}", saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Get Vessel"));
    }

    @Test
    void getVesselById_ShouldReturnNotFound_WhenNotExists() throws Exception {
        mockMvc.perform(get("/api/vessels/{id}", 999L))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void updateVessel_ShouldUpdateVessel_WhenExists() throws Exception {
        Vessel vessel = Vessel.builder()
                .name("Update Vessel")
                .type("Yacht")
                .length("25.0")
                .clientId(1L)
                .build();
        Vessel saved = vesselRepository.save(vessel);

        CreateVesselRequest updateRequest = CreateVesselRequest.builder()
                .name("Updated Vessel")
                .type("Catamaran")
                .length("30.0")
                .clientId(1L)
                .build();

        mockMvc.perform(put("/api/vessels/{id}", saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Vessel"))
                .andExpect(jsonPath("$.type").value("Catamaran"))
                .andExpect(jsonPath("$.length").value("30.0"));
    }

    @Test
    void deleteVessel_ShouldDeleteVessel_WhenExists() throws Exception {
        Vessel vessel = Vessel.builder()
                .name("Delete Vessel")
                .type("Yacht")
                .length("25.0")
                .clientId(1L)
                .build();
        Vessel saved = vesselRepository.save(vessel);

        mockMvc.perform(delete("/api/vessels/{id}", saved.getId()))
                .andExpect(status().isNoContent());

        // Verify deletion
        mockMvc.perform(get("/api/vessels/{id}", saved.getId()))
                .andExpect(status().is4xxClientError());
    }
}
