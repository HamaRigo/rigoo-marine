package com.rigoomarine.client.repository;

import com.rigoomarine.client.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {

    List<TeamMember> findAllByOrderByDisplayOrderAscCreatedAtDesc();

    List<TeamMember> findByDepartmentOrderByDisplayOrderAsc(String department);

    @Query("SELECT m FROM TeamMember m WHERE m.active = true ORDER BY m.displayOrder ASC, m.createdAt DESC")
    List<TeamMember> findAllActive();
}
