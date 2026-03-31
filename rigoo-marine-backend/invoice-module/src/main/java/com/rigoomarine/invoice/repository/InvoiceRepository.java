package com.rigoomarine.invoice.repository;

import com.rigoomarine.invoice.entity.Invoice;
import com.rigoomarine.invoice.entity.Invoice.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    List<Invoice> findByClientId(Long clientId);
    List<Invoice> findByWorkOrderId(Long workOrderId);
    List<Invoice> findByStatus(InvoiceStatus status);
}
