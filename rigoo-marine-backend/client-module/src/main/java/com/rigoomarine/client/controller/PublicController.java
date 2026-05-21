package com.rigoomarine.client.controller;

import com.rigoomarine.client.dto.ContactInfoDTO;
import com.rigoomarine.client.service.ContactInfoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Unauthenticated read-only endpoints for public-facing data.
 * Permitted in SecurityConfig via /api/public/**, routed by the gateway.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final ContactInfoService contactInfoService;

    /** Returns active contact info entries — used by the footer on every page. */
    @GetMapping("/contact-info")
    public ResponseEntity<List<ContactInfoDTO>> getContactInfo() {
        return ResponseEntity.ok(contactInfoService.getActiveContactInfo());
    }
}
