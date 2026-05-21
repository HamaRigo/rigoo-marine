package com.rigoomarine.workorder.controller;

import com.rigoomarine.workorder.entity.InventoryPart;
import com.rigoomarine.workorder.repository.InventoryPartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

/**
 * Parts inventory CRUD.
 *
 * Read access: TECHNICIAN, TEAM_LEAD, ADMIN (technicians need to browse
 * parts when submitting a parts request on a work order).
 *
 * Write access: TEAM_LEAD, ADMIN only.
 *
 * Stock adjustment (PATCH /{id}/stock) is kept separate from the full
 * PUT update so team leads can bump quantities without touching prices
 * or descriptions.
 */
@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryPartRepository repo;

    // ─── Read endpoints (all staff) ───────────────────────────────────────────

    @PreAuthorize("hasAnyRole('TECHNICIAN','TEAM_LEAD','ADMIN')")
    @GetMapping
    public ResponseEntity<Page<InventoryPart>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pg = PageRequest.of(Math.max(page, 0), Math.min(size, 100),
                Sort.by("name").ascending());
        String qLow = (q != null && !q.isBlank()) ? q.toLowerCase() : null;
        String cat  = (category != null && !category.isBlank()) ? category : null;
        return ResponseEntity.ok(repo.search(qLow, cat, pg));
    }

    @PreAuthorize("hasAnyRole('TECHNICIAN','TEAM_LEAD','ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<InventoryPart> getById(@PathVariable Long id) {
        return ResponseEntity.ok(findOrThrow(id));
    }

    @PreAuthorize("hasAnyRole('TEAM_LEAD','ADMIN')")
    @GetMapping("/low-stock")
    public ResponseEntity<List<InventoryPart>> lowStock() {
        return ResponseEntity.ok(repo.findLowStock());
    }

    // ─── Write endpoints (TEAM_LEAD, ADMIN) ───────────────────────────────────

    @PreAuthorize("hasAnyRole('TEAM_LEAD','ADMIN')")
    @PostMapping
    @Transactional
    public ResponseEntity<InventoryPart> create(@RequestBody InventoryPart part) {
        if (part.getSku() == null || part.getSku().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sku required");
        if (part.getName() == null || part.getName().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name required");
        if (repo.existsBySku(part.getSku().trim()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SKU already exists: " + part.getSku());
        part.setId(null); // prevent client from forcing an id
        part.setActive(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(part));
    }

    @PreAuthorize("hasAnyRole('TEAM_LEAD','ADMIN')")
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<InventoryPart> update(@PathVariable Long id,
                                                @RequestBody InventoryPart body) {
        InventoryPart existing = findOrThrow(id);
        existing.setSku(body.getSku() != null ? body.getSku() : existing.getSku());
        existing.setName(body.getName() != null ? body.getName() : existing.getName());
        existing.setDescription(body.getDescription());
        existing.setQuantityOnHand(body.getQuantityOnHand() != null ? body.getQuantityOnHand() : existing.getQuantityOnHand());
        existing.setReorderLevel(body.getReorderLevel() != null ? body.getReorderLevel() : existing.getReorderLevel());
        existing.setUnitCostQar(body.getUnitCostQar());
        existing.setSupplier(body.getSupplier());
        existing.setLocation(body.getLocation());
        existing.setCategory(body.getCategory());
        return ResponseEntity.ok(repo.save(existing));
    }

    /** Lightweight stock adjustment — only touches quantity_on_hand. */
    @PreAuthorize("hasAnyRole('TEAM_LEAD','ADMIN')")
    @PatchMapping("/{id}/stock")
    @Transactional
    public ResponseEntity<InventoryPart> adjustStock(@PathVariable Long id,
                                                     @RequestBody Map<String, Object> body) {
        Object rawDelta = body.get("delta");
        if (rawDelta == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "delta required");
        int delta;
        try { delta = Integer.parseInt(rawDelta.toString()); }
        catch (NumberFormatException nfe) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "delta must be an integer");
        }
        InventoryPart part = findOrThrow(id);
        int next = part.getQuantityOnHand() + delta;
        if (next < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "Stock cannot go negative (current=" + part.getQuantityOnHand() + ", delta=" + delta + ")");
        part.setQuantityOnHand(next);
        return ResponseEntity.ok(repo.save(part));
    }

    /** Soft-delete: sets active=false rather than removing the row. */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        InventoryPart part = findOrThrow(id);
        part.setActive(false);
        repo.save(part);
        return ResponseEntity.noContent().build();
    }

    private InventoryPart findOrThrow(Long id) {
        return repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Part not found: " + id));
    }
}
