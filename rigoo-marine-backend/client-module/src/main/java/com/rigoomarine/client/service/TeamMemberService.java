package com.rigoomarine.client.service;

import com.rigoomarine.client.dto.CreateTeamMemberRequest;
import com.rigoomarine.client.dto.TeamMemberDTO;
import com.rigoomarine.client.entity.TeamMember;
import com.rigoomarine.client.repository.TeamMemberRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamMemberService {

    private final TeamMemberRepository repo;

    public List<TeamMemberDTO> getAll() {
        return repo.findAllByOrderByDisplayOrderAscCreatedAtDesc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<TeamMemberDTO> getActive() {
        return repo.findAllActive()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public TeamMemberDTO getById(Long id) {
        return toDTO(find(id));
    }

    public TeamMemberDTO create(CreateTeamMemberRequest req) {
        TeamMember m = TeamMember.builder()
                .name(req.getName())
                .nameAr(req.getNameAr())
                .role(req.getRole())
                .roleAr(req.getRoleAr())
                .bio(req.getBio())
                .bioAr(req.getBioAr())
                .photoUrl(req.getPhotoUrl())
                .department(req.getDepartment() != null ? req.getDepartment() : "general")
                .linkedinUrl(req.getLinkedinUrl())
                .email(req.getEmail())
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0)
                .active(req.getActive() != null ? req.getActive() : true)
                .build();
        return toDTO(repo.save(m));
    }

    public TeamMemberDTO update(Long id, CreateTeamMemberRequest req) {
        TeamMember m = find(id);
        m.setName(req.getName());
        m.setNameAr(req.getNameAr());
        m.setRole(req.getRole());
        m.setRoleAr(req.getRoleAr());
        m.setBio(req.getBio());
        m.setBioAr(req.getBioAr());
        m.setPhotoUrl(req.getPhotoUrl());
        if (req.getDepartment() != null) m.setDepartment(req.getDepartment());
        m.setLinkedinUrl(req.getLinkedinUrl());
        m.setEmail(req.getEmail());
        if (req.getDisplayOrder() != null) m.setDisplayOrder(req.getDisplayOrder());
        if (req.getActive() != null) m.setActive(req.getActive());
        return toDTO(repo.save(m));
    }

    public void toggleActive(Long id) {
        TeamMember m = find(id);
        m.setActive(!Boolean.TRUE.equals(m.getActive()));
        repo.save(m);
    }

    public void delete(Long id) {
        repo.delete(find(id));
    }

    private TeamMember find(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("TeamMember not found: " + id));
    }

    private TeamMemberDTO toDTO(TeamMember m) {
        TeamMemberDTO dto = new TeamMemberDTO();
        dto.setId(m.getId());
        dto.setName(m.getName());
        dto.setNameAr(m.getNameAr());
        dto.setRole(m.getRole());
        dto.setRoleAr(m.getRoleAr());
        dto.setBio(m.getBio());
        dto.setBioAr(m.getBioAr());
        dto.setPhotoUrl(m.getPhotoUrl());
        dto.setDepartment(m.getDepartment());
        dto.setLinkedinUrl(m.getLinkedinUrl());
        dto.setEmail(m.getEmail());
        dto.setDisplayOrder(m.getDisplayOrder());
        dto.setActive(m.getActive());
        dto.setCreatedAt(m.getCreatedAt());
        dto.setUpdatedAt(m.getUpdatedAt());
        return dto;
    }
}
