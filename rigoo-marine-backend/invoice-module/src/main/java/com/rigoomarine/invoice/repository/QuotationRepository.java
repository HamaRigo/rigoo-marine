package com.rigoomarine.invoice.repository;

import com.rigoomarine.invoice.entity.Quotation;
import com.rigoomarine.invoice.entity.Quotation.QuotationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Long>, JpaSpecificationExecutor<Quotation> {
    Optional<Quotation> findByQuotationNumber(String quotationNumber);
    List<Quotation> findByClientId(Long clientId);
    List<Quotation> findByStatus(QuotationStatus status);
}
