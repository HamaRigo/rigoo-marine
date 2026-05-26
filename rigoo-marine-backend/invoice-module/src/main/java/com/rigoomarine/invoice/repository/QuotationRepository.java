package com.rigoomarine.invoice.repository;

import com.rigoomarine.invoice.entity.Quotation;
import com.rigoomarine.invoice.entity.Quotation.QuotationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Long>, JpaSpecificationExecutor<Quotation> {
    Optional<Quotation> findByQuotationNumber(String quotationNumber);
    List<Quotation> findByClientId(Long clientId);
    List<Quotation> findByStatus(QuotationStatus status);

    // PENDING quotations whose expiry date has passed
    List<Quotation> findByStatusAndExpiryDateBefore(QuotationStatus status, LocalDateTime expiryDate);

    // CANCELLED quotations whose cancelledAt is older than the given threshold
    List<Quotation> findByStatusAndCancelledAtBefore(QuotationStatus status, LocalDateTime threshold);

    @Query("SELECT MAX(q.quotationNumber) FROM Quotation q WHERE q.quotationNumber LIKE :prefix%")
    Optional<String> findMaxQuotationNumberWithPrefix(@Param("prefix") String prefix);
}
