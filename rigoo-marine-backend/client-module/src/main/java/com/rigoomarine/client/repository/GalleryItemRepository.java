package com.rigoomarine.client.repository;

import com.rigoomarine.client.entity.GalleryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface GalleryItemRepository extends JpaRepository<GalleryItem, Long> {

    List<GalleryItem> findAllByOrderByDisplayOrderAscCreatedAtDesc();

    List<GalleryItem> findByCategoryOrderByDisplayOrderAsc(String category);

    @Query("SELECT g FROM GalleryItem g WHERE g.published = true ORDER BY g.displayOrder ASC, g.createdAt DESC")
    List<GalleryItem> findAllPublished();
}
