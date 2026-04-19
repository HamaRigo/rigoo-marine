package com.rigoomarine.client.repository;

import com.rigoomarine.client.entity.Media;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaRepository extends JpaRepository<Media, Long> {
    List<Media> findByType(Media.MediaType type);
    List<Media> findByCategory(String category);
    List<Media> findByActiveTrueOrderByCreatedAtDesc();
}
