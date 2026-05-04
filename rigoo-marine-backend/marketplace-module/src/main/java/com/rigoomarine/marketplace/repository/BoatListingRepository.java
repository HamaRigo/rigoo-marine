package com.rigoomarine.marketplace.repository;

import com.rigoomarine.marketplace.entity.BoatListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BoatListingRepository extends JpaRepository<BoatListing, Long>, JpaSpecificationExecutor<BoatListing> {
    Optional<BoatListing> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
