package com.rigoomarine.invoice.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.rigoomarine.invoice.entity.Quotation;
import com.rigoomarine.invoice.entity.QuotationItem;
import com.rigoomarine.invoice.repository.QuotationRepository;
import com.rigoomarine.invoice.dto.QuotationDTO;
import com.rigoomarine.invoice.dto.CreateQuotationRequest;
import com.rigoomarine.invoice.dto.QuotationItemDTO;
import com.rigoomarine.invoice.util.BrandingAssetLoader;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
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
import java.time.LocalDate;
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
        if (request.getClientId() == null && (request.getBillToName() == null || request.getBillToName().isBlank())) {
            throw new IllegalArgumentException("Either a registered client or a bill-to name is required");
        }

        List<QuotationItem> itemEntities = request.getItems().stream()
            .map(item -> QuotationItem.builder()
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .taxRate(item.getTaxRate() != null ? item.getTaxRate() : BigDecimal.ZERO)
                .build())
            .collect(Collectors.toList());

        // Force DRAFT if client info is incomplete
        boolean hasClient = request.getClientId() != null ||
                (request.getBillToName() != null && !request.getBillToName().isBlank());
        Quotation.QuotationStatus resolvedStatus = !hasClient ? Quotation.QuotationStatus.DRAFT
                : (request.getStatus() != null ? Quotation.QuotationStatus.valueOf(request.getStatus()) : Quotation.QuotationStatus.DRAFT);

        Quotation quotation = Quotation.builder()
            .quotationNumber(generateQuotationNumber())
            .clientId(request.getClientId())
            .billToName(request.getBillToName())
            .billToEmail(request.getBillToEmail())
            .billToPhone(request.getBillToPhone())
            .billToAddress(request.getBillToAddress())
            .billToCompany(request.getBillToCompany())
            .status(resolvedStatus)
            .issueDate(request.getIssueDate())
            .expiryDate(request.getExpiryDate())
            .items(itemEntities)
            .notes(request.getNotes())
            .terms(request.getTerms())
            .termsArabic(request.getTermsArabic())
            .logoUrl(request.getLogoUrl())
            .insertedImages(request.getInsertedImages() != null ? request.getInsertedImages() : new ArrayList<>())
            .build();

        itemEntities.forEach(item -> item.setQuotation(quotation));

        BigDecimal subtotal = itemEntities.stream()
            .map(item -> item.getUnitPrice().multiply(new BigDecimal(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal taxRate = itemEntities.stream()
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

        quotation.setWatermark(resolveWatermark(quotation.getStatus()));

        return toDTO(quotationRepository.save(quotation));
    }

    @Transactional(readOnly = true)
    public List<QuotationDTO> getQuotationsByClientId(Long clientId) {
        return quotationRepository.findByClientId(clientId).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<QuotationDTO> getAllQuotations() {
        return quotationRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<QuotationDTO> searchPaged(String q, String status, Long clientId,
            String clientName, String itemName, LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {
        Specification<Quotation> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("quotationNumber")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("billToName"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("notes"), "")), like)));
            }
            if (status != null && !status.isBlank())
                predicates.add(cb.equal(root.get("status"), Quotation.QuotationStatus.valueOf(status)));
            if (clientId != null)
                predicates.add(cb.equal(root.get("clientId"), clientId));
            if (clientName != null && !clientName.isBlank()) {
                predicates.add(cb.like(cb.lower(cb.coalesce(root.get("billToName"), "")),
                        "%" + clientName.toLowerCase() + "%"));
            }
            if (itemName != null && !itemName.isBlank()) {
                String like = "%" + itemName.toLowerCase() + "%";
                jakarta.persistence.criteria.Subquery<Long> sub = cq.subquery(Long.class);
                jakarta.persistence.criteria.Root<Quotation> sr = sub.from(Quotation.class);
                Join<Quotation, QuotationItem> sj = sr.join("items");
                sub.select(sr.get("id")).where(cb.and(
                        cb.equal(sr.get("id"), root.get("id")),
                        cb.like(cb.lower(sj.get("description")), like)));
                predicates.add(cb.exists(sub));
            }
            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("issueDate"), dateFrom.atStartOfDay()));
            }
            if (dateTo != null) {
                predicates.add(cb.lessThan(root.get("issueDate"), dateTo.plusDays(1).atStartOfDay()));
            }
            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
        return quotationRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public QuotationDTO getQuotationById(Long id) {
        return quotationRepository.findById(id).map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
    }

    @Transactional(readOnly = true)
    public QuotationDTO getQuotationByNumber(String quotationNumber) {
        return quotationRepository.findByQuotationNumber(quotationNumber).map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
    }

    public QuotationDTO updateQuotation(Long id, CreateQuotationRequest request) {
        Quotation quotation = quotationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Quotation not found"));

        quotation.setClientId(request.getClientId());
        quotation.setBillToName(request.getBillToName());
        quotation.setBillToEmail(request.getBillToEmail());
        quotation.setBillToPhone(request.getBillToPhone());
        quotation.setBillToAddress(request.getBillToAddress());
        quotation.setBillToCompany(request.getBillToCompany());
        quotation.setStatus(request.getStatus() != null ? Quotation.QuotationStatus.valueOf(request.getStatus()) : quotation.getStatus());
        quotation.setIssueDate(request.getIssueDate());
        quotation.setExpiryDate(request.getExpiryDate());
        quotation.setNotes(request.getNotes());
        quotation.setTerms(request.getTerms());
        quotation.setTermsArabic(request.getTermsArabic());
        quotation.setLogoUrl(request.getLogoUrl());

        quotation.getItems().clear();
        List<QuotationItem> newItems = request.getItems().stream()
            .map(item -> QuotationItem.builder()
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .taxRate(item.getTaxRate() != null ? item.getTaxRate() : BigDecimal.ZERO)
                .quotation(quotation)
                .build())
            .collect(Collectors.toList());
        quotation.getItems().addAll(newItems);

        BigDecimal subtotal = newItems.stream()
            .map(item -> item.getUnitPrice().multiply(new BigDecimal(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal taxRate = newItems.stream()
            .map(QuotationItem::getTaxRate).filter(r -> r != null)
            .max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal taxAmount = subtotal.multiply(taxRate.divide(new BigDecimal("100")));
        quotation.setSubtotal(subtotal);
        quotation.setTaxRate(taxRate);
        quotation.setTaxAmount(taxAmount);
        quotation.setTotal(subtotal.add(taxAmount));

        // Auto-DRAFT if client info was cleared during edit
        boolean hasClient = quotation.getClientId() != null ||
                (quotation.getBillToName() != null && !quotation.getBillToName().isBlank());
        if (!hasClient) quotation.setStatus(Quotation.QuotationStatus.DRAFT);

        quotation.setWatermark(resolveWatermark(quotation.getStatus()));

        return toDTO(quotationRepository.save(quotation));
    }

    public QuotationDTO updateQuotationStatus(Long id, String status) {
        Quotation q = quotationRepository.findById(id).orElseThrow(() -> new RuntimeException("Quotation not found"));
        Quotation.QuotationStatus newStatus = Quotation.QuotationStatus.valueOf(status);
        q.setStatus(newStatus);
        if (newStatus == Quotation.QuotationStatus.ACCEPTED && q.getAcceptedAt() == null) {
            q.setAcceptedAt(LocalDateTime.now());
        }
        if (newStatus == Quotation.QuotationStatus.CANCELLED && q.getCancelledAt() == null) {
            q.setCancelledAt(LocalDateTime.now());
        }
        q.setWatermark(resolveWatermark(newStatus));
        return toDTO(quotationRepository.save(q));
    }

    public void deleteQuotation(Long id) {
        quotationRepository.deleteById(id);
    }

    private static String resolveWatermark(Quotation.QuotationStatus st) {
        return switch (st) {
            case DRAFT     -> "DRAFT";
            case ACCEPTED  -> "ACCEPTED";
            case REJECTED  -> "REJECTED";
            case EXPIRED   -> "EXPIRED";
            case CANCELLED -> "CANCELLED";
            case ARCHIVED  -> "ARCHIVED";
            default        -> "QUOTATION";
        };
    }

    private String generateQuotationNumber() {
        String year   = String.valueOf(LocalDateTime.now().getYear());
        String prefix = "QUO-" + year + "-";
        long next = quotationRepository.findMaxQuotationNumberWithPrefix(prefix)
            .map(max -> {
                try { return Long.parseLong(max.substring(prefix.length())) + 1; }
                catch (NumberFormatException e) { return 1L; }
            })
            .orElse(1L);
        return prefix + String.format("%03d", next);
    }

    private QuotationDTO toDTO(Quotation q) {
        return QuotationDTO.builder()
            .id(q.getId())
            .quotationNumber(q.getQuotationNumber())
            .clientId(q.getClientId())
            .billToName(q.getBillToName())
            .billToEmail(q.getBillToEmail())
            .billToPhone(q.getBillToPhone())
            .billToAddress(q.getBillToAddress())
            .billToCompany(q.getBillToCompany())
            .status(q.getStatus().name())
            .issueDate(q.getIssueDate())
            .expiryDate(q.getExpiryDate())
            .items(q.getItems().stream().map(item -> QuotationItemDTO.builder()
                .id(item.getId())
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .taxRate(item.getTaxRate())
                .amount(item.getAmount())
                .build()).collect(Collectors.toList()))
            .subtotal(q.getSubtotal())
            .taxRate(q.getTaxRate())
            .taxAmount(q.getTaxAmount())
            .total(q.getTotal())
            .notes(q.getNotes())
            .terms(q.getTerms())
            .termsArabic(q.getTermsArabic())
            .logoUrl(q.getLogoUrl())
            .insertedImages(q.getInsertedImages())
            .watermark(q.getWatermark())
            .acceptedAt(q.getAcceptedAt())
            .cancelledAt(q.getCancelledAt())
            .createdAt(q.getCreatedAt())
            .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PDF — identical layout to InvoiceService, adapted for Quotation fields
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public byte[] generateQuotationPdf(Long id) {
        Quotation quotation = quotationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Quotation not found"));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 40, 40, 40, 82);
            PdfWriter pdfWriter = PdfWriter.getInstance(document, out);

            // Pre-load Arabic font so the page-event footer can render it on every page
            BaseFont arabicBf = null;
            try {
                java.io.InputStream afs = BrandingAssetLoader.class.getClassLoader()
                        .getResourceAsStream("branding/ArialUnicode.ttf");
                if (afs != null) {
                    byte[] afb = afs.readAllBytes();
                    arabicBf = BaseFont.createFont("ArialUnicode.ttf",
                            BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, afb, null);
                }
            } catch (Exception ignored) {}

            // Watermark + fixed bilingual footer on every page
            try {
                BaseFont wmarkBf = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
                Image wmarkImg = BrandingAssetLoader.loadWatermark();
                pdfWriter.setPageEvent(new QuotationPageEvent(wmarkImg, wmarkBf, arabicBf, quotation.getNotes()));
            } catch (Exception ignored) {}

            document.open();

            // ── Colors ───────────────────────────────────────────────────────
            Color primaryBlue   = new Color(46, 91, 168);
            Color deepBlue      = new Color(28, 57, 110);
            Color accentGold    = new Color(180, 148, 75);
            Color tableHeaderBg = new Color(70, 100, 150);
            Color billToBg      = new Color(232, 232, 232);
            Color altRowBg      = new Color(248, 248, 248);

            // ── Fonts ────────────────────────────────────────────────────────
            Font normalFont    = new Font(Font.HELVETICA,  9, Font.NORMAL);
            Font boldFont      = new Font(Font.HELVETICA,  9, Font.BOLD);
            Font smallFont     = new Font(Font.HELVETICA,  8, Font.NORMAL);
            Font tableHdrFont  = new Font(Font.HELVETICA,  9, Font.BOLD, Color.WHITE);
            Font totalBoldFont = new Font(Font.HELVETICA, 10, Font.BOLD, primaryBlue);
            Font footerFont    = new Font(Font.HELVETICA,  7, Font.NORMAL);
            Font titleBig      = new Font(Font.HELVETICA, 34, Font.BOLD, deepBlue);
            Font labelGray     = new Font(Font.HELVETICA,  8, Font.BOLD, new Color(120, 120, 120));

            // ── Arabic font (reuse the BaseFont pre-loaded for the page event) ────
            Font arabicFont     = arabicBf != null ? new Font(arabicBf, 8, Font.NORMAL) : smallFont;
            Font arabicBoldFont = arabicBf != null ? new Font(arabicBf, 8, Font.BOLD)   : boldFont;

            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            java.text.NumberFormat nf = java.text.NumberFormat.getNumberInstance();
            nf.setMinimumFractionDigits(2);
            nf.setMaximumFractionDigits(2);

            // ── 1. HEADER: LOGO (left) | QUOTATION TITLE (right) ─────────────
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{12, 88});
            headerTable.setSpacingAfter(0);

            PdfPCell logoHdrCell = new PdfPCell();
            logoHdrCell.setBackgroundColor(Color.WHITE);
            logoHdrCell.setBorder(Rectangle.NO_BORDER);
            logoHdrCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            logoHdrCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            logoHdrCell.setPadding(4);
            Image logoImage = null;
            if (quotation.getLogoUrl() != null && !quotation.getLogoUrl().isBlank()) {
                try { logoImage = Image.getInstance(quotation.getLogoUrl()); } catch (Exception ignored) {}
            }
            if (logoImage == null) logoImage = BrandingAssetLoader.loadLogo();
            if (logoImage != null) {
                logoImage.scaleToFit(62, 92);
                logoImage.setAlignment(Image.ALIGN_CENTER);
                logoHdrCell.addElement(logoImage);
            }
            headerTable.addCell(logoHdrCell);

            PdfPCell rightCell = new PdfPCell();
            rightCell.setBackgroundColor(Color.WHITE);
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setPaddingTop(18);
            rightCell.setPaddingBottom(14);
            rightCell.setPaddingLeft(22);
            rightCell.setPaddingRight(16);
            rightCell.setVerticalAlignment(Element.ALIGN_TOP);
            rightCell.addElement(new Paragraph("QUOTATION", titleBig));

            PdfPTable accentBar = new PdfPTable(1);
            accentBar.setWidthPercentage(100);
            accentBar.setSpacingBefore(4);
            accentBar.setSpacingAfter(8);
            PdfPCell accentCell = new PdfPCell(new Phrase(" "));
            accentCell.setBackgroundColor(accentGold);
            accentCell.setBorder(Rectangle.NO_BORDER);
            accentCell.setFixedHeight(2.5f);
            accentBar.addCell(accentCell);
            rightCell.addElement(accentBar);

            String issueStr = quotation.getIssueDate()  != null ? quotation.getIssueDate().format(dateFmt)  : "-";
            String expStr   = quotation.getExpiryDate() != null ? quotation.getExpiryDate().format(dateFmt) : "-";
            PdfPTable detailsGrid = new PdfPTable(2);
            detailsGrid.setWidthPercentage(100);
            detailsGrid.setWidths(new float[]{30, 70});
            for (String[] row : new String[][]{
                    {"Quotation No.", quotation.getQuotationNumber()},
                    {"Date",          issueStr},
                    {"Valid Until",   expStr}}) {
                PdfPCell lc = new PdfPCell(new Phrase(row[0], labelGray));
                lc.setBorder(Rectangle.NO_BORDER); lc.setPaddingBottom(3);
                detailsGrid.addCell(lc);
                PdfPCell vc = new PdfPCell(new Phrase(row[1], normalFont));
                vc.setBorder(Rectangle.NO_BORDER); vc.setPaddingBottom(3);
                detailsGrid.addCell(vc);
            }
            rightCell.addElement(detailsGrid);
            headerTable.addCell(rightCell);
            document.add(headerTable);

            // ── 2. CONTACT STRIP ─────────────────────────────────────────────
            PdfPTable contactStrip = new PdfPTable(3);
            contactStrip.setWidthPercentage(100);
            contactStrip.setWidths(new float[]{34, 33, 33});
            contactStrip.setSpacingBefore(0);
            contactStrip.setSpacingAfter(10);
            Color stripBg = new Color(240, 244, 252);
            for (String item : new String[]{"Qatar, Doha", "+974 709 709 17", "rigoomarine@gmail.com"}) {
                PdfPCell cc = new PdfPCell(new Phrase(item, smallFont));
                cc.setBackgroundColor(stripBg);
                cc.setBorder(Rectangle.NO_BORDER);
                cc.setPadding(5);
                cc.setPaddingLeft(10);
                contactStrip.addCell(cc);
            }
            document.add(contactStrip);

            // ── 3. BILL TO BAR ────────────────────────────────────────────────
            String clientDisplay = quotation.getBillToName() != null ? quotation.getBillToName()
                    : (quotation.getClientId() != null ? "Client #" + quotation.getClientId() : "");
            PdfPTable billToTable = new PdfPTable(1);
            billToTable.setWidthPercentage(100);
            billToTable.setSpacingAfter(10);
            PdfPCell billToCell = new PdfPCell();
            billToCell.setBackgroundColor(billToBg);
            billToCell.setBorder(Rectangle.NO_BORDER);
            billToCell.setPadding(6);
            billToCell.setPaddingLeft(8);
            Paragraph billToPara = new Paragraph();
            billToPara.add(new Chunk("Bill To : ", boldFont));
            billToPara.add(new Chunk(clientDisplay, boldFont));
            billToCell.addElement(billToPara);
            billToTable.addCell(billToCell);
            document.add(billToTable);

            // ── 4. LINE ITEMS TABLE ───────────────────────────────────────────
            PdfPTable itemsTable = new PdfPTable(4);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{46, 10, 22, 22});
            itemsTable.setSpacingAfter(14);
            for (String h : new String[]{"Description", "Qty", "Unit Price", "Amount"}) {
                PdfPCell hc = new PdfPCell(new Phrase(h, tableHdrFont));
                hc.setBackgroundColor(tableHeaderBg);
                hc.setBorder(Rectangle.NO_BORDER);
                hc.setPadding(6);
                hc.setHorizontalAlignment(h.equals("Description") ? Element.ALIGN_LEFT : Element.ALIGN_RIGHT);
                itemsTable.addCell(hc);
            }
            boolean alt = false;
            for (QuotationItem item : quotation.getItems()) {
                Color rowBg = alt ? altRowBg : Color.WHITE;
                pdfItemCell(itemsTable, item.getDescription(), normalFont, rowBg, Element.ALIGN_LEFT);
                pdfItemCell(itemsTable, String.valueOf(item.getQuantity()), normalFont, rowBg, Element.ALIGN_RIGHT);
                pdfItemCell(itemsTable, "QAR " + nf.format(item.getUnitPrice()), normalFont, rowBg, Element.ALIGN_RIGHT);
                pdfItemCell(itemsTable, "QAR " + nf.format(item.getAmount()), normalFont, rowBg, Element.ALIGN_RIGHT);
                alt = !alt;
            }
            document.add(itemsTable);

            // ── 5. BOTTOM: TERMS | EMPTY | TOTALS ────────────────────────────
            PdfPTable bottomTable = new PdfPTable(3);
            bottomTable.setWidthPercentage(100);
            bottomTable.setWidths(new float[]{38, 24, 38});
            bottomTable.setSpacingAfter(8);

            PdfPCell termsCell = new PdfPCell();
            termsCell.setBorder(Rectangle.NO_BORDER);
            termsCell.setPadding(4);
            Paragraph termsPara = new Paragraph();
            termsPara.add(new Chunk("Payment Terms\n", boldFont));
            if (quotation.getTerms() != null && !quotation.getTerms().isBlank()) {
                termsPara.add(new Chunk("Important Notes\n", boldFont));
                for (String line : quotation.getTerms().split("\n")) {
                    if (!line.isBlank()) termsPara.add(new Chunk(line.trim() + "\n", smallFont));
                }
            }
            termsCell.addElement(termsPara);
            if (quotation.getTermsArabic() != null && !quotation.getTermsArabic().isBlank()) {
                PdfPTable arabicWrapper = new PdfPTable(1);
                arabicWrapper.setWidthPercentage(100);
                arabicWrapper.setSpacingBefore(4);
                PdfPCell arabicInner = new PdfPCell();
                arabicInner.setBorder(Rectangle.NO_BORDER);
                arabicInner.setRunDirection(PdfWriter.RUN_DIRECTION_RTL);
                arabicInner.setPadding(0);
                arabicInner.setHorizontalAlignment(Element.ALIGN_RIGHT);
                Paragraph arPara = new Paragraph();
                arPara.setAlignment(Element.ALIGN_RIGHT);
                arPara.add(new Chunk("ملاحظات هامة\n", arabicBoldFont));
                for (String line : quotation.getTermsArabic().split("\n")) {
                    if (!line.isBlank()) arPara.add(new Chunk(line.trim() + "\n", arabicFont));
                }
                arabicInner.addElement(arPara);
                arabicWrapper.addCell(arabicInner);
                termsCell.addElement(arabicWrapper);
            }
            bottomTable.addCell(termsCell);

            PdfPCell emptyCenter = new PdfPCell();
            emptyCenter.setBorder(Rectangle.NO_BORDER);
            bottomTable.addCell(emptyCenter);

            PdfPCell totalsOuterCell = new PdfPCell();
            totalsOuterCell.setBorder(Rectangle.NO_BORDER);
            totalsOuterCell.setPadding(2);
            PdfPTable totalsInner = new PdfPTable(2);
            totalsInner.setWidthPercentage(100);
            addTotalsRow(totalsInner, "Subtotal",              "QAR " + nf.format(quotation.getSubtotal()),  normalFont, normalFont);
            addTotalsRow(totalsInner, "Subtotal less Discount","QAR " + nf.format(quotation.getSubtotal()),  normalFont, normalFont);
            addTotalsRow(totalsInner, "Tax Rate",               quotation.getTaxRate() + "%",                  normalFont, normalFont);
            addTotalsRow(totalsInner, "Total Tax",             "QAR " + nf.format(quotation.getTaxAmount()), normalFont, normalFont);
            PdfPCell tlLabel = new PdfPCell(new Phrase("Total", boldFont));
            tlLabel.setBorder(Rectangle.TOP); tlLabel.setBorderWidthTop(1.5f);
            tlLabel.setPadding(5); tlLabel.setHorizontalAlignment(Element.ALIGN_LEFT);
            totalsInner.addCell(tlLabel);
            PdfPCell tlValue = new PdfPCell(new Phrase("QAR " + nf.format(quotation.getTotal()), totalBoldFont));
            tlValue.setBorder(Rectangle.TOP); tlValue.setBorderWidthTop(1.5f);
            tlValue.setPadding(5); tlValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalsInner.addCell(tlValue);
            totalsOuterCell.addElement(totalsInner);
            bottomTable.addCell(totalsOuterCell);
            document.add(bottomTable);

            // ── 6. AUTHORIZED SIGNATURE ───────────────────────────────────────
            PdfPTable sigTable = new PdfPTable(1);
            sigTable.setWidthPercentage(35);
            sigTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            sigTable.setSpacingBefore(16);
            sigTable.setSpacingAfter(14);
            PdfPCell sc = new PdfPCell();
            sc.setBorder(Rectangle.NO_BORDER);
            sc.setPadding(6);
            sc.setPaddingTop(20);
            sc.setHorizontalAlignment(Element.ALIGN_CENTER);
            Image sigStamp = BrandingAssetLoader.loadStamp();
            if (sigStamp != null) {
                sigStamp.scaleToFit(75, 75);
                sc.setCellEvent(new StampBackground(sigStamp));
            }
            sc.addElement(new Paragraph("Authorized Signature", smallFont));
            sigTable.addCell(sc);
            document.add(sigTable);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private static void pdfItemCell(PdfPTable table, String text, Font font, Color bg, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setBackgroundColor(bg);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(6);
        cell.setHorizontalAlignment(align);
        table.addCell(cell);
    }

    private static void addTotalsRow(PdfPTable table, String label, String value, Font lf, Font vf) {
        PdfPCell lc = new PdfPCell(new Phrase(label, lf));
        lc.setBorder(Rectangle.NO_BORDER); lc.setPadding(4); lc.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(lc);
        PdfPCell vc = new PdfPCell(new Phrase(value, vf));
        vc.setBorder(Rectangle.NO_BORDER); vc.setPadding(4); vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(vc);
    }

    private static boolean containsArabic(String text) {
        return text.chars().anyMatch(c -> c >= 0x0600 && c <= 0x06FF);
    }

    private static class StampBackground implements PdfPCellEvent {
        private final Image stamp;
        StampBackground(Image stamp) { this.stamp = stamp; }

        @Override
        public void cellLayout(PdfPCell cell, Rectangle pos, PdfContentByte[] canvases) {
            try {
                PdfContentByte cb = canvases[PdfPTable.BACKGROUNDCANVAS];
                float x = pos.getLeft()   + (pos.getWidth()  - stamp.getScaledWidth())  / 2f;
                float y = pos.getBottom() + (pos.getHeight() - stamp.getScaledHeight()) / 2f;
                stamp.setAbsolutePosition(x, y);
                cb.addImage(stamp);
            } catch (Exception ignored) {}
        }
    }

    private static class QuotationPageEvent extends PdfPageEventHelper {
        private final Image watermarkImage;
        private final BaseFont bf;
        private final BaseFont arabicBf;
        private final String notes;
        private final float wmarkOrigW;
        private final float wmarkOrigH;
        private PdfTemplate pageCountTemplate;

        private static final String COMPLIANCE_EN =
            "This quotation is issued in two languages (Arabic & English) per Qatari customs and commercial requirements.";
        private static final String COMPLIANCE_AR =
            "يُصدر هذا العرض باللغتين العربية والإنجليزية وفقاً للأعراف والمتطلبات التجارية القطرية.";

        QuotationPageEvent(Image watermarkImage, BaseFont bf, BaseFont arabicBf, String notes) {
            this.watermarkImage = watermarkImage;
            this.bf = bf;
            this.arabicBf = arabicBf;
            this.notes = notes;
            this.wmarkOrigW = watermarkImage != null ? watermarkImage.getWidth()  : 0f;
            this.wmarkOrigH = watermarkImage != null ? watermarkImage.getHeight() : 0f;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document doc) {
            pageCountTemplate = writer.getDirectContent().createTemplate(30, 12);
        }

        @Override
        public void onEndPage(PdfWriter writer, Document doc) {
            Rectangle ps = doc.getPageSize();
            PdfContentByte cb = writer.getDirectContent();
            float leftX  = ps.getLeft()  + 40f;
            float rightX = ps.getRight() - 40f;
            float midX   = (leftX + rightX) / 2f;
            Color gold      = new Color(180, 148, 75);
            Color textColor = new Color(120, 100, 40);
            boolean hasNotes = notes != null && !notes.isBlank();

            // ── Watermark over content ────────────────────────────────────────────
            if (watermarkImage != null && wmarkOrigW > 0 && wmarkOrigH > 0) {
                try {
                    cb.saveState();
                    PdfGState gs = new PdfGState();
                    gs.setFillOpacity(0.10f);
                    gs.setStrokeOpacity(0.10f);
                    gs.setBlendMode(PdfGState.BM_NORMAL);
                    cb.setGState(gs);
                    float maxW = ps.getWidth()  * 0.60f;
                    float maxH = ps.getHeight() * 0.60f;
                    float scale = Math.min(maxW / wmarkOrigW, maxH / wmarkOrigH);
                    float w = wmarkOrigW * scale;
                    float h = wmarkOrigH * scale;
                    watermarkImage.setAbsolutePosition((ps.getWidth() - w) / 2f, (ps.getHeight() - h) / 2f);
                    watermarkImage.scaleAbsolute(w, h);
                    cb.addImage(watermarkImage);
                    cb.restoreState();
                } catch (Exception ignored) {}
            }

            // ── Fixed footer ──────────────────────────────────────────────────────
            cb.saveState();
            cb.setColorStroke(gold);
            cb.setLineWidth(0.5f);
            cb.moveTo(leftX,  ps.getBottom() + 74f);
            cb.lineTo(rightX, ps.getBottom() + 74f);
            cb.stroke();
            cb.restoreState();

            float complianceTop;
            float complianceBottom = ps.getBottom() + 24f;

            if (hasNotes) {
                String notesLine = notes.length() > 130 ? notes.substring(0, 127) + "..." : notes;
                cb.saveState();
                cb.setColorFill(textColor);
                cb.beginText();
                cb.setFontAndSize(bf, 7);
                cb.setTextMatrix(leftX, ps.getBottom() + 62f);
                cb.showText("Notes:  " + notesLine);
                cb.endText();
                cb.restoreState();

                cb.saveState();
                cb.setColorStroke(gold);
                cb.setLineWidth(0.3f);
                cb.moveTo(leftX,  ps.getBottom() + 58f);
                cb.lineTo(rightX, ps.getBottom() + 58f);
                cb.stroke();
                cb.restoreState();

                complianceTop = ps.getBottom() + 56f;
            } else {
                complianceTop = ps.getBottom() + 72f;
            }

            // Bilingual compliance text — EN left, AR right
            try {
                ColumnText ctEn = new ColumnText(cb);
                ctEn.setSimpleColumn(leftX, complianceBottom, midX - 4f, complianceTop);
                ctEn.addText(new Phrase(COMPLIANCE_EN, new Font(bf, 7, Font.ITALIC, textColor)));
                ctEn.go();
            } catch (Exception ignored) {}

            try {
                BaseFont arBf = arabicBf != null ? arabicBf : bf;
                ColumnText ctAr = new ColumnText(cb);
                ctAr.setRunDirection(PdfWriter.RUN_DIRECTION_RTL);
                ctAr.setSimpleColumn(midX + 4f, complianceBottom, rightX, complianceTop);
                ctAr.addText(new Phrase(COMPLIANCE_AR, new Font(arBf, 7, Font.NORMAL, textColor)));
                ctAr.go();
            } catch (Exception ignored) {}

            // ── Page number ───────────────────────────────────────────────────────
            String pageLabel = "Page " + writer.getPageNumber() + " / ";
            float labelWidth = bf.getWidthPoint(pageLabel, 7f);
            float numX = rightX;
            float numY = ps.getBottom() + 10f;
            cb.saveState();
            cb.beginText();
            cb.setFontAndSize(bf, 7);
            cb.setColorFill(new Color(120, 120, 120));
            cb.setTextMatrix(numX - labelWidth, numY);
            cb.showText(pageLabel);
            cb.endText();
            cb.addTemplate(pageCountTemplate, numX, numY);
            cb.restoreState();
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document doc) {
            ColumnText.showTextAligned(pageCountTemplate, Element.ALIGN_LEFT,
                    new Phrase(String.valueOf(writer.getPageNumber() - 1),
                            new Font(bf, 7, Font.NORMAL, new Color(120, 120, 120))),
                    0, 2, 0);
        }
    }
}
