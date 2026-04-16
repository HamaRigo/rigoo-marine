package com.rigoomarine.invoice.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.rigoomarine.invoice.entity.Invoice;
import com.rigoomarine.invoice.entity.InvoiceItem;
import com.rigoomarine.invoice.repository.InvoiceRepository;
import com.rigoomarine.invoice.dto.InvoiceDTO;
import com.rigoomarine.invoice.dto.CreateInvoiceRequest;
import com.rigoomarine.invoice.dto.InvoiceItemDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
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

    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));

        try (ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            PdfWriter writer = PdfWriter.getInstance(document, byteArrayOutputStream);
            document.open();

            // Font definitions
            Font headerFont = new Font(Font.HELVETICA, 14, Font.BOLD);
            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            Font normalFont = new Font(Font.HELVETICA, 10, Font.NORMAL);
            Font boldFont = new Font(Font.HELVETICA, 10, Font.BOLD);
            Font smallFont = new Font(Font.HELVETICA, 9, Font.NORMAL);
            Font footerFont = new Font(Font.HELVETICA, 8, Font.NORMAL);

            // ============== HEADER (Striped Layout Style) ==============
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new int[]{1, 1});
            headerTable.setSpacingAfter(15);
            headerTable.setSpacingBefore(10);

            // Left side - Logo and tagline
            PdfPCell logoCell = new PdfPCell();
            logoCell.setBorder(Rectangle.NO_BORDER);
            logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

            // Company name as logo placeholder
            Paragraph companyName = new Paragraph("RIGOO MARINE", titleFont);
            companyName.setSpacingAfter(5);
            logoCell.addElement(companyName);

            // Report header / tagline
            Paragraph tagline = new Paragraph("Professional Marine Services", new Font(Font.HELVETICA, 9, Font.BOLD));
            logoCell.addElement(tagline);

            headerTable.addCell(logoCell);

            // Right side - Company address block
            PdfPCell addressCell = new PdfPCell();
            addressCell.setBorder(Rectangle.NO_BORDER);
            addressCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            addressCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

            Paragraph companyAddress = new Paragraph();
            companyAddress.add(new Chunk("Rigoo Marine AB\n", boldFont));
            companyAddress.add(new Chunk("123 Harbor Street\n"));
            companyAddress.add(new Chunk("456 78 Stockholm\n"));
            companyAddress.add(new Chunk("Sweden\n"));
            companyAddress.add(new Chunk("VAT: SE123456789001\n", smallFont));
            companyAddress.add(new Chunk("info@rigoomarine.com\n", smallFont));
            addressCell.addElement(companyAddress);

            headerTable.addCell(addressCell);
            document.add(headerTable);

            // Striped separator line
            PdfPTable separatorTable = new PdfPTable(1);
            separatorTable.setWidthPercentage(100);
            separatorTable.setSpacingAfter(15);
            PdfPCell separatorCell = new PdfPCell();
            separatorCell.setBackgroundColor(new Color(240, 240, 240));
            separatorCell.setBorder(Rectangle.NO_BORDER);
            separatorCell.setPadding(3);
            separatorCell.addElement(new Paragraph("INVOICE", titleFont));
            separatorTable.addCell(separatorCell);
            document.add(separatorTable);

            // ============== ADDRESS LAYOUT ==============
            PdfPTable addressLayout = new PdfPTable(2);
            addressLayout.setWidthPercentage(100);
            addressLayout.setWidths(new int[]{1, 1});
            addressLayout.setSpacingAfter(20);

            // Bill To section
            PdfPCell billToCell = new PdfPCell();
            billToCell.setBorder(Rectangle.NO_BORDER);
            billToCell.setPaddingBottom(10);

            Paragraph billToTitle = new Paragraph("Bill To:", boldFont);
            billToTitle.setSpacingAfter(5);
            billToCell.addElement(billToTitle);

            // Client info (placeholder - would need client service integration)
            Paragraph clientInfo = new Paragraph();
            clientInfo.add(new Chunk("Client ID: " + invoice.getClientId() + "\n", smallFont));
            clientInfo.add(new Chunk("Work Order: #" + invoice.getWorkOrderId() + "\n", smallFont));
            billToCell.addElement(clientInfo);

            addressLayout.addCell(billToCell);

            // Invoice Info section
            PdfPCell invoiceInfoCell = new PdfPCell();
            invoiceInfoCell.setBorder(Rectangle.NO_BORDER);
            invoiceInfoCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            invoiceInfoCell.setPaddingBottom(10);

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            Paragraph invoiceInfo = new Paragraph();
            invoiceInfo.add(new Chunk("Invoice No: " + invoice.getInvoiceNumber() + "\n", smallFont));
            invoiceInfo.add(new Chunk("Issue Date: " + invoice.getIssueDate().format(dateFormatter) + "\n", smallFont));
            invoiceInfo.add(new Chunk("Due Date: " + invoice.getDueDate().format(dateFormatter) + "\n", smallFont));
            if (invoice.getPaidAt() != null) {
                invoiceInfo.add(new Chunk("Paid Date: " + invoice.getPaidAt().format(dateFormatter) + "\n", smallFont));
            }
            invoiceInfoCell.addElement(invoiceInfo);

            addressLayout.addCell(invoiceInfoCell);
            document.add(addressLayout);

            // ============== INVOICE ITEMS TABLE ==============
            PdfPTable itemsTable = new PdfPTable(5);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new int[]{40, 15, 15, 15, 15});
            itemsTable.setSpacingAfter(15);

            // Table header with striped background
            String[] headers = {"Description", "Quantity", "Unit Price", "Tax %", "Amount"};
            for (String header : headers) {
                PdfPCell headerCell = new PdfPCell(new Phrase(header, boldFont));
                headerCell.setBackgroundColor(new Color(240, 240, 240));
                headerCell.setBorder(Rectangle.NO_BORDER);
                headerCell.setPadding(8);
                headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                itemsTable.addCell(headerCell);
            }

            // Alternating row colors (striped effect)
            boolean evenRow = true;
            for (InvoiceItem item : invoice.getItems()) {
                Color rowColor = evenRow ? Color.WHITE : new Color(250, 250, 250);

                PdfPCell descCell = new PdfPCell(new Phrase(item.getDescription(), normalFont));
                descCell.setBackgroundColor(rowColor);
                descCell.setBorder(Rectangle.NO_BORDER);
                descCell.setPadding(6);
                itemsTable.addCell(descCell);

                PdfPCell qtyCell = new PdfPCell(new Phrase(String.valueOf(item.getQuantity()), normalFont));
                qtyCell.setBackgroundColor(rowColor);
                qtyCell.setBorder(Rectangle.NO_BORDER);
                qtyCell.setPadding(6);
                qtyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                itemsTable.addCell(qtyCell);

                PdfPCell priceCell = new PdfPCell(new Phrase("$" + item.getUnitPrice().toString(), normalFont));
                priceCell.setBackgroundColor(rowColor);
                priceCell.setBorder(Rectangle.NO_BORDER);
                priceCell.setPadding(6);
                priceCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                itemsTable.addCell(priceCell);

                PdfPCell taxCell = new PdfPCell(new Phrase(item.getTaxRate() + "%", normalFont));
                taxCell.setBackgroundColor(rowColor);
                taxCell.setBorder(Rectangle.NO_BORDER);
                taxCell.setPadding(6);
                taxCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                itemsTable.addCell(taxCell);

                PdfPCell amountCell = new PdfPCell(new Phrase("$" + item.getAmount().toString(), normalFont));
                amountCell.setBackgroundColor(rowColor);
                amountCell.setBorder(Rectangle.NO_BORDER);
                amountCell.setPadding(6);
                amountCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                itemsTable.addCell(amountCell);

                evenRow = !evenRow;
            }

            document.add(itemsTable);

            // ============== TOTALS SECTION ==============
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setWidthPercentage(50);
            totalsTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalsTable.setSpacingAfter(15);

            // Subtotal
            totalsTable.addCell(createTotalsCell("Subtotal:", normalFont, Rectangle.NO_BORDER));
            totalsTable.addCell(createTotalsCell("$" + invoice.getSubtotal().toString(), normalFont, Rectangle.NO_BORDER));

            // Tax
            totalsTable.addCell(createTotalsCell("Tax (" + invoice.getTaxRate() + "%):", normalFont, Rectangle.NO_BORDER));
            totalsTable.addCell(createTotalsCell("$" + invoice.getTaxAmount().toString(), normalFont, Rectangle.NO_BORDER));

            // Total - with top border
            PdfPCell totalLabelCell = createTotalsCell("Total:", boldFont, Rectangle.NO_BORDER);
            totalLabelCell.setBorder(Rectangle.TOP);
            totalLabelCell.setBorderWidthTop(2);
            totalsTable.addCell(totalLabelCell);

            PdfPCell totalValueCell = createTotalsCell("$" + invoice.getTotal().toString(), boldFont, Rectangle.NO_BORDER);
            totalValueCell.setBorder(Rectangle.TOP);
            totalValueCell.setBorderWidthTop(2);
            totalsTable.addCell(totalValueCell);

            document.add(totalsTable);

            // ============== NOTES AND TERMS ==============
            if (invoice.getNotes() != null && !invoice.getNotes().isEmpty()) {
                PdfPTable notesTable = new PdfPTable(1);
                notesTable.setWidthPercentage(100);
                notesTable.setSpacingBefore(10);
                PdfPCell notesCell = new PdfPCell();
                notesCell.setBackgroundColor(new Color(250, 250, 250));
                notesCell.setBorder(Rectangle.NO_BORDER);
                notesCell.setPadding(8);
                notesCell.addElement(new Paragraph("Notes:", boldFont));
                notesCell.addElement(new Paragraph(invoice.getNotes(), smallFont));
                notesTable.addCell(notesCell);
                document.add(notesTable);
            }

            if (invoice.getTerms() != null && !invoice.getTerms().isEmpty()) {
                PdfPTable termsTable = new PdfPTable(1);
                termsTable.setWidthPercentage(100);
                termsTable.setSpacingBefore(10);
                PdfPCell termsCell = new PdfPCell();
                termsCell.setBorder(Rectangle.NO_BORDER);
                termsCell.setPadding(8);
                termsCell.addElement(new Paragraph("Terms & Conditions:", boldFont));
                termsCell.addElement(new Paragraph(invoice.getTerms(), smallFont));
                termsTable.addCell(termsCell);
                document.add(termsTable);
            }

            // ============== FOOTER (Striped Layout Style) ==============
            // Add spacer before footer
            document.add(new Paragraph("\n"));

            // Footer with page numbers
            PdfPTable footerTable = new PdfPTable(1);
            footerTable.setWidthPercentage(100);
            footerTable.setTotalWidth(new float[]{450});
            footerTable.setLockedWidth(true);

            PdfPCell footerCell = new PdfPCell();
            footerCell.setBorder(Rectangle.TOP);
            footerCell.setBorderWidthTop(1);
            footerCell.setBorderColorTop(Color.LIGHT_GRAY);
            footerCell.setPadding(5);
            footerCell.setHorizontalAlignment(Element.ALIGN_CENTER);

            // Report footer
            if (invoice.getTerms() != null && !invoice.getTerms().isEmpty()) {
                footerCell.addElement(new Paragraph("Thank you for your business!", footerFont));
            } else {
                footerCell.addElement(new Paragraph("Rigoo Marine AB | info@rigoomarine.com | +46 8 123 456", footerFont));
            }

            // Page numbers (for PDF type)
            Paragraph pageNumPara = new Paragraph("Page 1 / 1", footerFont);
            pageNumPara.setSpacingBefore(5);
            footerCell.addElement(pageNumPara);

            footerTable.addCell(footerCell);
            document.add(footerTable);

            document.close();
            return byteArrayOutputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private PdfPCell createTotalsCell(String text, Font font, int border) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(border);
        cell.setPadding(6);
        cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        return cell;
    }
}
