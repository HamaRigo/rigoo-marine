package com.rigoomarine.invoice.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.rigoomarine.invoice.entity.Invoice;
import com.rigoomarine.invoice.entity.InvoiceItem;
import com.rigoomarine.invoice.repository.InvoiceRepository;
import com.rigoomarine.invoice.dto.InvoiceDTO;
import com.rigoomarine.invoice.dto.CreateInvoiceRequest;
import com.rigoomarine.invoice.dto.InvoiceItemDTO;
import com.rigoomarine.invoice.util.BrandingAssetLoader;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.awt.Color;
import java.util.ArrayList;
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
            .termsArabic(request.getTermsArabic())
            .logoUrl(request.getLogoUrl())
            .insertedImages(request.getInsertedImages() != null ? request.getInsertedImages() : new java.util.ArrayList<>())
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
    public Page<InvoiceDTO> searchPaged(String q, String status, Long clientId, Pageable pageable) {
        Specification<Invoice> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("invoiceNumber")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("notes"), "")), like)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), Invoice.InvoiceStatus.valueOf(status)));
            }
            if (clientId != null) {
                predicates.add(cb.equal(root.get("clientId"), clientId));
            }
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return invoiceRepository.findAll(spec, pageable).map(this::toDTO);
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
            .termsArabic(invoice.getTermsArabic())
            .logoUrl(invoice.getLogoUrl())
            .insertedImages(invoice.getInsertedImages())
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

            // Logo: per-invoice URL wins; otherwise fall back to classpath:branding/logo.png; otherwise text header.
            Image logoImage = null;
            if (invoice.getLogoUrl() != null && !invoice.getLogoUrl().isEmpty()) {
                try {
                    logoImage = Image.getInstance(invoice.getLogoUrl());
                } catch (Exception ignored) {
                }
            }
            if (logoImage == null) {
                logoImage = BrandingAssetLoader.loadLogo();
            }
            if (logoImage != null) {
                logoImage.scaleToFit(120, 60);
                logoCell.addElement(logoImage);
                logoCell.addElement(Chunk.NEWLINE);
            } else {
                Paragraph companyName = new Paragraph("RIGOO MARINE", titleFont);
                companyName.setSpacingAfter(5);
                logoCell.addElement(companyName);
            }

            // Report header / tagline
            Paragraph tagline = new Paragraph("Professional Marine Services", new Font(Font.HELVETICA, 9, Font.BOLD));
            logoCell.addElement(tagline);

            headerTable.addCell(logoCell);

            // Right side - Company address block (Qatar format)
            PdfPCell addressCell = new PdfPCell();
            addressCell.setBorder(Rectangle.NO_BORDER);
            addressCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            addressCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

            Paragraph companyAddress = new Paragraph();
            companyAddress.add(new Chunk("Rigoo Marine W.L.L.\n", boldFont));
            companyAddress.add(new Chunk("P.O. Box 12345\n"));
            companyAddress.add(new Chunk("Doha, Qatar\n"));
            companyAddress.add(new Chunk("VAT: QR1234567890123\n", smallFont));
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

            // ============== INSERTED IMAGES ==============
            if (invoice.getInsertedImages() != null && !invoice.getInsertedImages().isEmpty()) {
                PdfPTable imagesTable = new PdfPTable(2);
                imagesTable.setWidthPercentage(100);
                imagesTable.setWidths(new int[]{1, 1});
                imagesTable.setSpacingBefore(15);
                imagesTable.setSpacingAfter(15);

                for (String imageUrl : invoice.getInsertedImages()) {
                    try {
                        Image img = Image.getInstance(imageUrl);
                        img.scaleToFit(250, 180);
                        img.setAlignment(Image.ALIGN_CENTER);
                        PdfPCell imgCell = new PdfPCell();
                        imgCell.setBorder(Rectangle.NO_BORDER);
                        imgCell.setPadding(5);
                        imgCell.addElement(img);
                        imagesTable.addCell(imgCell);
                    } catch (Exception e) {
                        // Skip invalid images
                    }
                }
                document.add(imagesTable);
            }

            // ============== NOTES AND TERMS (Qatari - English & Arabic) ==============
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

            // English Terms
            if (invoice.getTerms() != null && !invoice.getTerms().isEmpty()) {
                PdfPTable termsTable = new PdfPTable(1);
                termsTable.setWidthPercentage(100);
                termsTable.setSpacingBefore(10);
                PdfPCell termsCell = new PdfPCell();
                termsCell.setBackgroundColor(new Color(250, 250, 250));
                termsCell.setBorder(Rectangle.NO_BORDER);
                termsCell.setPadding(8);
                termsCell.addElement(new Paragraph("Terms & Conditions (English):", boldFont));
                termsCell.addElement(new Paragraph(invoice.getTerms(), smallFont));
                termsTable.addCell(termsCell);
                document.add(termsTable);
            }

            // Arabic Terms (Qatari)
            if (invoice.getTermsArabic() != null && !invoice.getTermsArabic().isEmpty()) {
                PdfPTable termsArabicTable = new PdfPTable(1);
                termsArabicTable.setWidthPercentage(100);
                termsArabicTable.setSpacingBefore(10);
                PdfPCell termsArabicCell = new PdfPCell();
                termsArabicCell.setBackgroundColor(new Color(250, 250, 250));
                termsArabicCell.setBorder(Rectangle.NO_BORDER);
                termsArabicCell.setPadding(8);
                termsArabicCell.addElement(new Paragraph("الشروط والأحكام (العربية):", boldFont));
                termsArabicCell.addElement(new Paragraph(invoice.getTermsArabic(), smallFont));
                termsArabicTable.addCell(termsArabicCell);
                document.add(termsArabicTable);
            }

            // ============== COMPANY STAMP (right-aligned, above the footer) ==============
            // Loads classpath:branding/stamp.png; silently skipped if not present.
            Image stampImage = BrandingAssetLoader.loadStamp();
            if (stampImage != null) {
                stampImage.scaleToFit(120, 120);
                PdfPTable stampTable = new PdfPTable(1);
                stampTable.setWidthPercentage(100);
                stampTable.setSpacingBefore(15);
                PdfPCell stampCell = new PdfPCell();
                stampCell.setBorder(Rectangle.NO_BORDER);
                stampCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                stampImage.setAlignment(Image.ALIGN_RIGHT);
                stampCell.addElement(stampImage);
                stampTable.addCell(stampCell);
                document.add(stampTable);
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
