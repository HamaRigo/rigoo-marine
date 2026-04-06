package com.rigoomarine.vessel.service;

import com.rigoomarine.vessel.dto.CreateVesselRequest;
import com.rigoomarine.vessel.dto.VesselDTO;
import com.rigoomarine.vessel.entity.Vessel;
import com.rigoomarine.vessel.repository.VesselRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VesselServiceTest {

    @Mock
    private VesselRepository vesselRepository;

    @InjectMocks
    private VesselService vesselService;

    private CreateVesselRequest createRequest;
    private Vessel vessel;

    @BeforeEach
    void setUp() {
        createRequest = CreateVesselRequest.builder()
                .clientId(1L)
                .name("Test Boat")
                .type("Motorboat")
                .engineType("Diesel")
                .brand("Sea Ray")
                .model("Sundancer")
                .year(2022)
                .length(28.5)
                .hullMaterial("Fiberglass")
                .registrationNumber("ABC-1234")
                .build();

        vessel = Vessel.builder()
                .id(1L)
                .clientId(1L)
                .name("Test Boat")
                .type("Motorboat")
                .engineType("Diesel")
                .brand("Sea Ray")
                .model("Sundancer")
                .year(2022)
                .length(28.5)
                .hullMaterial("Fiberglass")
                .registrationNumber("ABC-1234")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void createVessel_ShouldReturnVesselDTO() {
        when(vesselRepository.save(any(Vessel.class))).thenReturn(vessel);

        VesselDTO result = vesselService.createVessel(createRequest);

        assertNotNull(result);
        assertEquals("Test Boat", result.getName());
        assertEquals("ABC-1234", result.getRegistrationNumber());
        verify(vesselRepository).save(any(Vessel.class));
    }

    @Test
    void getVesselsByClientId_ShouldReturnList() {
        when(vesselRepository.findByClientId(1L)).thenReturn(List.of(vessel));

        List<VesselDTO> result = vesselService.getVesselsByClientId(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Test Boat", result.get(0).getName());
    }

    @Test
    void getVesselById_ShouldReturnVesselDTO_WhenExists() {
        when(vesselRepository.findById(1L)).thenReturn(Optional.of(vessel));

        VesselDTO result = vesselService.getVesselById(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
    }

    @Test
    void getVesselById_ShouldThrowException_WhenNotFound() {
        when(vesselRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> vesselService.getVesselById(99L));
    }

    @Test
    void deleteVessel_ShouldCallRepositoryDelete() {
        vesselService.deleteVessel(1L);
        verify(vesselRepository).deleteById(1L);
    }
}
