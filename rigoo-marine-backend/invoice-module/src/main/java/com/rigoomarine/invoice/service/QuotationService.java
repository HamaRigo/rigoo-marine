package com.rigoomarine.invoice.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.rigoomarine.invoice.entity.Quotation;
import com.rigoomarine.invoice.entity.QuotationItem;
import com.rigoomarine.invoice.repository.QuotationRepository;
import com.rigoomarine.invoice.dto.QuotationDTO;
import com.rigoomarine.invoice.dto.CreateQuotationRequest;
import com.rigoomarine.invoice.dto.QuotationItemDTO;
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
public class QuotationService {

    private final QuotationRepository quotationRepository;

    public QuotationDTO createQuotation(CreateQuotationRequest request) {
        Quotation quotation = Quotation.builder()
            .quotationNumber(generateQuotationNumber())
            .clientId(request.getClientId())
            .status(request.getStatus() != null ? Quotation.QuotationStatus.valueOf(request.getStatus()) : Quotation.QuotationStatus.DRAFT)
            .issueDate(request.getIssueDate())
            .expiryDate(request.getExpiryDate())
            .items(request.getItems().stream().map(item -> QuotationItem.builder()
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
            .build();

        // Calculate totals
        BigDecimal subtotal = quotation.getItems().stream()
            .map(QuotationItem::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal taxRate = quotation.getItems().stream()
            .map(QuotationItem::getTaxRate)
            .filter(r -> r != null)
            .max(BigDecimal::compareTo)
            .orElse(BigDecimal.ZERO);

        BigDecimal taxAmount = subtotal.multiply(taxRate.divide(new BigDecimal("100")));
        BigDecimal total = subtotal.add(taxAmount);

        quotation.setSubtotal(subtotal);
        quotation.setTaxRate(taxRate);
        quotation.setTaxAmount(taxAmount);
        quotation.setTotal(total);

        // Set watermark based on status
        if (quotation.getStatus() == Quotation.QuotationStatus.DRAFT) {
            quotation.setWatermark("DRAFT");
        } else if (quotation.getStatus() == Quotation.QuotationStatus.ACCEPTED) {
            quotation.setWatermark("ACCEPTED");
        } else if (quotation.getStatus() == Quotation.QuotationStatus.REJECTED) {
            quotation.setWatermark("REJECTED");
        } else {
            quotation.setWatermark("QUOTATION");
        }

        Quotation saved = quotationRepository.save(quotation);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<QuotationDTO> getQuotationsByClientId(Long clientId) {
        return quotationRepository.findByClientId(clientId).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<QuotationDTO> getAllQuotations() {
        return quotationRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<QuotationDTO> searchPaged(String q, String status, Long clientId, Pageable pageable) {
        Specification<Quotation> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("quotationNumber")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("notes"), "")), like)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), Quotation.QuotationStatus.valueOf(status)));
            }
            if (clientId != null) {
                predicates.add(cb.equal(root.get("clientId"), clientId));
            }
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return quotationRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public QuotationDTO getQuotationById(Long id) {
        return quotationRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Quotation not found"));
    }

    @Transactional(readOnly = true)
    public QuotationDTO getQuotationByNumber(String quotationNumber) {
        return quotationRepository.findByQuotationNumber(quotationNumber)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Quotation not found"));
    }

    public QuotationDTO updateQuotationStatus(Long id, String status) {
        Quotation quotation = quotationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Quotation not found"));

        Quotation.QuotationStatus newStatus = Quotation.QuotationStatus.valueOf(status);
        quotation.setStatus(newStatus);

        if (newStatus == Quotation.QuotationStatus.ACCEPTED) {
            quotation.setAcceptedAt(LocalDateTime.now());
            quotation.setWatermark("ACCEPTED");
        } else if (newStatus == Quotation.QuotationStatus.REJECTED) {
            quotation.setWatermark("REJECTED");
        } else if (newStatus == Quotation.QuotationStatus.DRAFT) {
            quotation.setWatermark("DRAFT");
        } else if (newStatus == Quotation.QuotationStatus.EXPIRED) {
            quotation.setWatermark("EXPIRED");
        } else {
            quotation.setWatermark("QUOTATION");
        }

        Quotation updated = quotationRepository.save(quotation);
        return toDTO(updated);
    }

    public void deleteQuotation(Long id) {
        quotationRepository.deleteById(id);
    }

    private String generateQuotationNumber() {
        String year = String.valueOf(LocalDateTime.now().getYear());
        long count = quotationRepository.count() + 1;
        return "QUO-" + year + "-" + String.format("%03d", count);
    }

    private QuotationDTO toDTO(Quotation quotation) {
        return QuotationDTO.builder()
            .id(quotation.getId())
            .quotationNumber(quotation.getQuotationNumber())
            .clientId(quotation.getClientId())
            .status(quotation.getStatus().name())
            .issueDate(quotation.getIssueDate())
            .expiryDate(quotation.getExpiryDate())
            .items(quotation.getItems().stream().map(item -> QuotationItemDTO.builder()
                .id(item.getId())
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .taxRate(item.getTaxRate())
                .amount(item.getAmount())
                .build()).collect(Collectors.toList()))
            .subtotal(quotation.getSubtotal())
            .taxRate(quotation.getTaxRate())
            .taxAmount(quotation.getTaxAmount())
            .total(quotation.getTotal())
            .notes(quotation.getNotes())
            .terms(quotation.getTerms())
            .termsArabic(quotation.getTermsArabic())
            .logoUrl(quotation.getLogoUrl())
            .insertedImages(quotation.getInsertedImages())
            .watermark(quotation.getWatermark())
            .acceptedAt(quotation.getAcceptedAt())
            .createdAt(quotation.getCreatedAt())
            .build();
    }

    @Transactional(readOnly = true)
    public byte[] generateQuotationPdf(Long id) {
        Quotation quotation = quotationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Quotation not found"));

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

            // ============== HEADER ==============
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new int[]{1, 1});
            headerTable.setSpacingAfter(15);
            headerTable.setSpacingBefore(10);

            // Left side - Logo and tagline
            PdfPCell logoCell = new PdfPCell();
            logoCell.setBorder(Rectangle.NO_BORDER);
            logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

            // Add logo image if available
            if (quotation.getLogoUrl() != null && !quotation.getLogoUrl().isEmpty()) {
                try {
                    Image logoImage = Image.getInstance(quotation.getLogoUrl());
                    logoImage.scaleToFit(120, 60);
                    logoCell.addElement(logoImage);
                    logoCell.addElement(Chunk.NEWLINE);
                } catch (Exception e) {
                    // If image fails, use text logo
                    Paragraph companyName = new Paragraph("RIGOO MARINE", titleFont);
                    companyName.setSpacingAfter(5);
                    logoCell.addElement(companyName);
                }
            } else {
                Paragraph companyName = new Paragraph("RIGOO MARINE", titleFont);
                companyName.setSpacingAfter(5);
                logoCell.addElement(companyName);
            }

            // Report header / tagline
            Paragraph tagline = new Paragraph("Professional Marine Services", boldFont);
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
            separatorCell.addElement(new Paragraph("QUOTATION", titleFont));
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

            Paragraph billToTitle = new Paragraph("Quotation For:", boldFont);
            billToTitle.setSpacingAfter(5);
            billToCell.addElement(billToTitle);

            Paragraph clientInfo = new Paragraph();
            clientInfo.add(new Chunk("Client ID: " + quotation.getClientId() + "\n", smallFont));
            billToCell.addElement(clientInfo);

            addressLayout.addCell(billToCell);

            // Quotation Info section
            PdfPCell quotationInfoCell = new PdfPCell();
            quotationInfoCell.setBorder(Rectangle.NO_BORDER);
            quotationInfoCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            quotationInfoCell.setPaddingBottom(10);

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            Paragraph quotationInfo = new Paragraph();
            quotationInfo.add(new Chunk("Quotation No: " + quotation.getQuotationNumber() + "\n", smallFont));
            quotationInfo.add(new Chunk("Issue Date: " + quotation.getIssueDate().format(dateFormatter) + "\n", smallFont));
            quotationInfo.add(new Chunk("Valid Until: " + quotation.getExpiryDate().format(dateFormatter) + "\n", smallFont));
            if (quotation.getAcceptedAt() != null) {
                quotationInfo.add(new Chunk("Accepted: " + quotation.getAcceptedAt().format(dateFormatter) + "\n", smallFont));
            }
            quotationInfoCell.addElement(quotationInfo);

            addressLayout.addCell(quotationInfoCell);
            document.add(addressLayout);

            // ============== QUOTATION ITEMS TABLE ==============
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
            for (QuotationItem item : quotation.getItems()) {
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
            totalsTable.addCell(createTotalsCell("$" + quotation.getSubtotal().toString(), normalFont, Rectangle.NO_BORDER));

            // Tax
            totalsTable.addCell(createTotalsCell("Tax (" + quotation.getTaxRate() + "%):", normalFont, Rectangle.NO_BORDER));
            totalsTable.addCell(createTotalsCell("$" + quotation.getTaxAmount().toString(), normalFont, Rectangle.NO_BORDER));

            // Total - with top border
            PdfPCell totalLabelCell = createTotalsCell("Total:", boldFont, Rectangle.NO_BORDER);
            totalLabelCell.setBorder(Rectangle.TOP);
            totalLabelCell.setBorderWidthTop(2);
            totalsTable.addCell(totalLabelCell);

            PdfPCell totalValueCell = createTotalsCell("$" + quotation.getTotal().toString(), boldFont, Rectangle.NO_BORDER);
            totalValueCell.setBorder(Rectangle.TOP);
            totalValueCell.setBorderWidthTop(2);
            totalsTable.addCell(totalValueCell);

            document.add(totalsTable);

            // ============== INSERTED IMAGES ==============
            if (quotation.getInsertedImages() != null && !quotation.getInsertedImages().isEmpty()) {
                PdfPTable imagesTable = new PdfPTable(2);
                imagesTable.setWidthPercentage(100);
                imagesTable.setWidths(new int[]{1, 1});
                imagesTable.setSpacingBefore(15);
                imagesTable.setSpacingAfter(15);

                for (String imageUrl : quotation.getInsertedImages()) {
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
            if (quotation.getNotes() != null && !quotation.getNotes().isEmpty()) {
                PdfPTable notesTable = new PdfPTable(1);
                notesTable.setWidthPercentage(100);
                notesTable.setSpacingBefore(10);
                PdfPCell notesCell = new PdfPCell();
                notesCell.setBackgroundColor(new Color(250, 250, 250));
                notesCell.setBorder(Rectangle.NO_BORDER);
                notesCell.setPadding(8);
                notesCell.addElement(new Paragraph("Notes:", boldFont));
                notesCell.addElement(new Paragraph(quotation.getNotes(), smallFont));
                notesTable.addCell(notesCell);
                document.add(notesTable);
            }

            // English Terms
            if (quotation.getTerms() != null && !quotation.getTerms().isEmpty()) {
                PdfPTable termsTable = new PdfPTable(1);
                termsTable.setWidthPercentage(100);
                termsTable.setSpacingBefore(10);
                PdfPCell termsCell = new PdfPCell();
                termsCell.setBackgroundColor(new Color(250, 250, 250));
                termsCell.setBorder(Rectangle.NO_BORDER);
                termsCell.setPadding(8);
                termsCell.addElement(new Paragraph("Terms & Conditions (English):", boldFont));
                termsCell.addElement(new Paragraph(quotation.getTerms(), smallFont));
                termsTable.addCell(termsCell);
                document.add(termsTable);
            }

            // Arabic Terms (Qatari)
            if (quotation.getTermsArabic() != null && !quotation.getTermsArabic().isEmpty()) {
                PdfPTable termsArabicTable = new PdfPTable(1);
                termsArabicTable.setWidthPercentage(100);
                termsArabicTable.setSpacingBefore(10);
                PdfPCell termsArabicCell = new PdfPCell();
                termsArabicCell.setBackgroundColor(new Color(250, 250, 250));
                termsArabicCell.setBorder(Rectangle.NO_BORDER);
                termsArabicCell.setPadding(8);
                termsArabicCell.addElement(new Paragraph("الشروط والأحكام (العربية):", boldFont));
                termsArabicCell.addElement(new Paragraph(quotation.getTermsArabic(), smallFont));
                termsArabicTable.addCell(termsArabicCell);
                document.add(termsArabicTable);
            }

            // ============== FOOTER ==============
            document.add(new Paragraph("\n"));

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

            footerCell.addElement(new Paragraph("This quotation is valid for 14 days from the issue date.", footerFont));
            footerCell.addElement(new Paragraph("Thank you for your interest in our services!", footerFont));

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
