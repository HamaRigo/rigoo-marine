package com.rigoomarine.shop.repository;

import com.rigoomarine.shop.entity.ProductInquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductInquiryRepository extends JpaRepository<ProductInquiry, Long>, JpaSpecificationExecutor<ProductInquiry> {
}
