package com.rigoomarine.invoice.service;

import com.rigoomarine.invoice.entity.Invoice;
import com.rigoomarine.invoice.entity.Quotation;
import com.rigoomarine.invoice.repository.InvoiceRepository;
import com.rigoomarine.invoice.repository.QuotationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class InvoiceStatusScheduler {

    private final InvoiceRepository invoiceRepository;
    private final QuotationRepository quotationRepository;

    /** Every hour: mark PENDING invoices whose due date has passed as OVERDUE. */
    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void markOverdue() {
        List<Invoice> overdue = invoiceRepository.findByStatusAndDueDateBefore(
                Invoice.InvoiceStatus.PENDING, LocalDateTime.now());
        if (overdue.isEmpty()) return;
        for (Invoice inv : overdue) {
            inv.setStatus(Invoice.InvoiceStatus.OVERDUE);
            inv.setWatermark("OVERDUE");
        }
        invoiceRepository.saveAll(overdue);
        log.info("Marked {} invoice(s) as OVERDUE", overdue.size());
    }

    /** Every hour: archive CANCELLED invoices that have been cancelled for over 24 h. */
    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void archiveCancelled() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        List<Invoice> toArchive = invoiceRepository.findByStatusAndCancelledAtBefore(
                Invoice.InvoiceStatus.CANCELLED, threshold);
        if (toArchive.isEmpty()) return;
        for (Invoice inv : toArchive) {
            inv.setStatus(Invoice.InvoiceStatus.ARCHIVED);
            inv.setWatermark("ARCHIVED");
        }
        invoiceRepository.saveAll(toArchive);
        log.info("Archived {} cancelled invoice(s)", toArchive.size());
    }

    /** Every hour: mark PENDING quotations whose expiry date has passed as EXPIRED. */
    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void markQuotationsExpired() {
        List<Quotation> expired = quotationRepository.findByStatusAndExpiryDateBefore(
                Quotation.QuotationStatus.PENDING, LocalDateTime.now());
        if (expired.isEmpty()) return;
        for (Quotation q : expired) {
            q.setStatus(Quotation.QuotationStatus.EXPIRED);
            q.setWatermark("EXPIRED");
        }
        quotationRepository.saveAll(expired);
        log.info("Marked {} quotation(s) as EXPIRED", expired.size());
    }

    /** Every hour: archive CANCELLED quotations that have been cancelled for over 24 h. */
    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void archiveCancelledQuotations() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        List<Quotation> toArchive = quotationRepository.findByStatusAndCancelledAtBefore(
                Quotation.QuotationStatus.CANCELLED, threshold);
        if (toArchive.isEmpty()) return;
        for (Quotation q : toArchive) {
            q.setStatus(Quotation.QuotationStatus.ARCHIVED);
            q.setWatermark("ARCHIVED");
        }
        quotationRepository.saveAll(toArchive);
        log.info("Archived {} cancelled quotation(s)", toArchive.size());
    }
}
