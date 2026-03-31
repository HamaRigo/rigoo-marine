package com.rigoomarine.vessel.controller;

import com.rigoomarine.vessel.dto.VesselDTO;
import com.rigoomarine.vessel.dto.CreateVesselRequest;
import com.rigoomarine.vessel.service.VesselService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/vessels")
@RequiredArgsConstructor
public class VesselController {

    private final VesselService vesselService;

    @PostMapping
    public ResponseEntity<VesselDTO> createVessel(@Valid @RequestBody CreateVesselRequest request) {
        return ResponseEntity.ok(vesselService.createVessel(request));
    }

    @GetMapping("/my")
    public ResponseEntity<List<VesselDTO>> getVesselsByClient(@RequestParam Long clientId) {
        return ResponseEntity.ok(vesselService.getVesselsByClientId(clientId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VesselDTO> getVesselById(@PathVariable Long id) {
        return ResponseEntity.ok(vesselService.getVesselById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VesselDTO> updateVessel(
        @PathVariable Long id,
        @Valid @RequestBody CreateVesselRequest request
    ) {
        return ResponseEntity.ok(vesselService.updateVessel(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVessel(@PathVariable Long id) {
        vesselService.deleteVessel(id);
        return ResponseEntity.noContent().build();
    }
}
