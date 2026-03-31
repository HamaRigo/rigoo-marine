package com.rigoomarine.invoice.service;

import com.rigoomarine.invoice.entity.Invoice;
import com.rigoomarine.invoice.entity.InvoiceItem;
import com.rigoomarine.invoice.repository.InvoiceRepository;
import com.rigoomarine.invoice.dto.InvoiceDTO;
import com.rigoomarine.invoice.dto.CreateInvoiceRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    public InvoiceDTO createInvoice(CreateInvoiceRequest request) {
        Invoice invoice = Invoice.builder()
            .invoiceNumber(generateInvoiceNumber())
            .workOrderId(request.getWorkOrderId())
            .clientId(request.getClientId())
            .status(request.getStatus() != null ? Invoice.InvoiceStatus.valueOf(request.getStatus()) : Invoice.InvoiceStatus.PENDING)
            .issueDate(request.getIssueDate())
            .dueDate(request.getDueDate())
            .items(request.getItems().stream().map(item -> InvoiceItem.builder()
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .taxRate(item.getTaxRate() != null ? item.getTaxRate() : BigDecimal.ZERO)
                .build()).collect(Collectors.toList()))
            .notes(request.getNotes())
            .terms(request.getTerms())
            .qrCode(request.getQrCode())
            .build();

        // Calculate totals
        BigDecimal subtotal = invoice.getItems().stream()
            .map(InvoiceItem::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal taxRate = invoice.getItems().stream()
            .map(InvoiceItem::getTaxRate)
            .filter(r -> r != null)
            .max(BigDecimal::compareTo)
            .orElse(BigDecimal.ZERO);

        BigDecimal taxAmount = subtotal.multiply(taxRate.divide(new BigDecimal("100")));
        BigDecimal total = subtotal.add(taxAmount);

        invoice.setSubtotal(subtotal);
        invoice.setTaxRate(taxRate);
        invoice.setTaxAmount(taxAmount);
        invoice.setTotal(total);

        // Set watermark based on status
        if (invoice.getStatus() == Invoice.InvoiceStatus.DRAFT) {
            invoice.setWatermark("DRAFT");
        } else if (invoice.getStatus() == Invoice.InvoiceStatus.CANCELLED) {
            invoice.setWatermark("CANCELLED");
        } else {
            invoice.setWatermark("CONFIDENTIAL");
        }

        Invoice saved = invoiceRepository.save(invoice);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDTO> getInvoicesByClientId(Long clientId) {
        return invoiceRepository.findByClientId(clientId).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InvoiceDTO> getAllInvoices() {
        return invoiceRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InvoiceDTO getInvoiceById(Long id) {
        return invoiceRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));
    }

    @Transactional(readOnly = true)
    public InvoiceDTO getInvoiceByNumber(String invoiceNumber) {
        return invoiceRepository.findByInvoiceNumber(invoiceNumber)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));
    }

    public InvoiceDTO updateInvoiceStatus(Long id, String status) {
        Invoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));

        Invoice.InvoiceStatus newStatus = Invoice.InvoiceStatus.valueOf(status);
        invoice.setStatus(newStatus);

        if (newStatus == Invoice.InvoiceStatus.PAID) {
            invoice.setPaidAt(LocalDateTime.now());
        }

        // Update watermark
        if (newStatus == Invoice.InvoiceStatus.DRAFT) {
            invoice.setWatermark("DRAFT");
        } else if (newStatus == Invoice.InvoiceStatus.CANCELLED) {
            invoice.setWatermark("CANCELLED");
        } else {
            invoice.setWatermark("CONFIDENTIAL");
        }

        Invoice updated = invoiceRepository.save(invoice);
        return toDTO(updated);
    }

    public void deleteInvoice(Long id) {
        invoiceRepository.deleteById(id);
    }

    private String generateInvoiceNumber() {
        String year = String.valueOf(LocalDateTime.now().getYear());
        long count = invoiceRepository.count() + 1;
        return "INV-" + year + "-" + String.format("%03d", count);
    }

    private InvoiceDTO toDTO(Invoice invoice) {
        return InvoiceDTO.builder()
            .id(invoice.getId())
            .invoiceNumber(invoice.getInvoiceNumber())
            .workOrderId(invoice.getWorkOrderId())
            .clientId(invoice.getClientId())
            .status(invoice.getStatus().name())
            .issueDate(invoice.getIssueDate())
            .dueDate(invoice.getDueDate())
            .items(invoice.getItems().stream().map(item -> InvoiceItemDTO.builder()
                .id(item.getId())
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .taxRate(item.getTaxRate())
                .amount(item.getAmount())
                .build()).collect(Collectors.toList()))
            .subtotal(invoice.getSubtotal())
            .taxRate(invoice.getTaxRate())
            .taxAmount(invoice.getTaxAmount())
            .total(invoice.getTotal())
            .notes(invoice.getNotes())
            .terms(invoice.getTerms())
            .watermark(invoice.getWatermark())
            .qrCode(invoice.getQrCode())
            .paidAt(invoice.getPaidAt())
            .createdAt(invoice.getCreatedAt())
            .build();
    }
}
