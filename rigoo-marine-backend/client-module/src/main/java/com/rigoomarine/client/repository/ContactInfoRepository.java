package com.rigoomarine.client.repository;

import com.rigoomarine.client.entity.ContactInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContactInfoRepository extends JpaRepository<ContactInfo, Long> {
    Optional<ContactInfo> findByKeyName(String keyName);
    List<ContactInfo> findByCategoryOrderByDisplayOrder(String category);
    List<ContactInfo> findByCategoryAndActiveTrueOrderByDisplayOrder(String category);
}
