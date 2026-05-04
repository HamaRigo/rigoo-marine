package com.rigoomarine.marketplace.repository;

import com.rigoomarine.marketplace.entity.BoatInquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface BoatInquiryRepository extends JpaRepository<BoatInquiry, Long>, JpaSpecificationExecutor<BoatInquiry> {
}
