package com.rigoomarine.technician.controller;

import com.rigoomarine.technician.dto.TechnicianDTO;
import com.rigoomarine.technician.service.TechnicianService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/technicians")
@RequiredArgsConstructor
public class TechnicianController {

    private final TechnicianService technicianService;

    @PostMapping
    public ResponseEntity<TechnicianDTO> createTechnician(@RequestBody TechnicianDTO dto) {
        return ResponseEntity.ok(technicianService.createTechnician(dto));
    }

    @GetMapping
    public ResponseEntity<List<TechnicianDTO>> getAllTechnicians() {
        return ResponseEntity.ok(technicianService.getAllTechnicians());
    }

    @GetMapping("/available")
    public ResponseEntity<List<TechnicianDTO>> getAvailableTechnicians() {
        return ResponseEntity.ok(technicianService.getAvailableTechnicians());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TechnicianDTO> getTechnicianById(@PathVariable Long id) {
        return ResponseEntity.ok(technicianService.getTechnicianById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TechnicianDTO> updateTechnician(@PathVariable Long id, @RequestBody TechnicianDTO dto) {
        return ResponseEntity.ok(technicianService.updateTechnician(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTechnician(@PathVariable Long id) {
        technicianService.deleteTechnician(id);
        return ResponseEntity.noContent().build();
    }
}
