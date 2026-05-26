package com.rigoomarine.invoice.repository;

import com.rigoomarine.invoice.entity.Invoice;
import com.rigoomarine.invoice.entity.Invoice.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    List<Invoice> findByClientId(Long clientId);
    List<Invoice> findByWorkOrderId(Long workOrderId);
    Optional<Invoice> findByShopOrderId(Long shopOrderId);
    List<Invoice> findByStatus(InvoiceStatus status);

    // Invoices that are still PENDING but past their due date
    List<Invoice> findByStatusAndDueDateBefore(InvoiceStatus status, LocalDateTime dueDate);

    // CANCELLED invoices whose cancelledAt is older than the given threshold
    List<Invoice> findByStatusAndCancelledAtBefore(InvoiceStatus status, LocalDateTime threshold);

    @Query("SELECT MAX(i.invoiceNumber) FROM Invoice i WHERE i.invoiceNumber LIKE :prefix%")
    Optional<String> findMaxInvoiceNumberWithPrefix(@Param("prefix") String prefix);
}
