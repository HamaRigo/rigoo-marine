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
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    public InvoiceDTO createInvoice(CreateInvoiceRequest request) {
        if (request.getClientId() == null && (request.getBillToName() == null || request.getBillToName().isBlank())) {
            throw new IllegalArgumentException("Either a registered client or a bill-to name is required");
        }
        List<InvoiceItem> itemEntities = request.getItems().stream()
            .map(item -> InvoiceItem.builder()
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .taxRate(item.getTaxRate() != null ? item.getTaxRate() : BigDecimal.ZERO)
                .build())
            .collect(Collectors.toList());

        Invoice invoice = Invoice.builder()
            .invoiceNumber(generateInvoiceNumber())
            .workOrderId(request.getWorkOrderId())
            .clientId(request.getClientId())
            .billToName(request.getBillToName())
            .billToEmail(request.getBillToEmail())
            .billToPhone(request.getBillToPhone())
            .billToAddress(request.getBillToAddress())
            .billToCompany(request.getBillToCompany())
            .status(request.getStatus() != null ? Invoice.InvoiceStatus.valueOf(request.getStatus()) : Invoice.InvoiceStatus.PENDING)
            .issueDate(request.getIssueDate())
            .dueDate(request.getDueDate())
            .items(itemEntities)
            .notes(request.getNotes())
            .terms(request.getTerms())
            .termsArabic(request.getTermsArabic())
            .logoUrl(request.getLogoUrl())
            .insertedImages(request.getInsertedImages() != null ? request.getInsertedImages() : new java.util.ArrayList<>())
            .qrCode(request.getQrCode())
            .build();

        // Bidirectional link — Hibernate uses item.invoice to write invoice_id FK
        itemEntities.forEach(item -> item.setInvoice(invoice));

        // Calculate totals — @PrePersist on InvoiceItem hasn't fired yet so getAmount() is null;
        // compute directly from unitPrice * quantity instead.
        BigDecimal subtotal = invoice.getItems().stream()
            .map(item -> item.getUnitPrice().multiply(new BigDecimal(item.getQuantity())))
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
    public Page<InvoiceDTO> searchPaged(String q, String status, Long clientId,
            String clientName, String itemName, LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {
        Specification<Invoice> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("invoiceNumber")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("billToName"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("notes"), "")), like)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), Invoice.InvoiceStatus.valueOf(status)));
            }
            if (clientId != null) {
                predicates.add(cb.equal(root.get("clientId"), clientId));
            }
            if (clientName != null && !clientName.isBlank()) {
                predicates.add(cb.like(cb.lower(cb.coalesce(root.get("billToName"), "")),
                        "%" + clientName.toLowerCase() + "%"));
            }
            if (itemName != null && !itemName.isBlank()) {
                String like = "%" + itemName.toLowerCase() + "%";
                jakarta.persistence.criteria.Subquery<Long> sub = cq.subquery(Long.class);
                jakarta.persistence.criteria.Root<Invoice> sr = sub.from(Invoice.class);
                Join<Invoice, InvoiceItem> sj = sr.join("items");
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

    public InvoiceDTO updateInvoice(Long id, CreateInvoiceRequest request) {
        Invoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));

        invoice.setWorkOrderId(request.getWorkOrderId());
        invoice.setClientId(request.getClientId());
        invoice.setBillToName(request.getBillToName());
        invoice.setBillToEmail(request.getBillToEmail());
        invoice.setBillToPhone(request.getBillToPhone());
        invoice.setBillToAddress(request.getBillToAddress());
        invoice.setBillToCompany(request.getBillToCompany());
        invoice.setStatus(request.getStatus() != null ? Invoice.InvoiceStatus.valueOf(request.getStatus()) : invoice.getStatus());
        invoice.setIssueDate(request.getIssueDate());
        invoice.setDueDate(request.getDueDate());
        invoice.setNotes(request.getNotes());
        invoice.setTerms(request.getTerms());
        invoice.setTermsArabic(request.getTermsArabic());
        invoice.setLogoUrl(request.getLogoUrl());
        invoice.setQrCode(request.getQrCode());

        invoice.getItems().clear();
        List<InvoiceItem> newItems = request.getItems().stream()
            .map(item -> InvoiceItem.builder()
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .taxRate(item.getTaxRate() != null ? item.getTaxRate() : BigDecimal.ZERO)
                .invoice(invoice)
                .build())
            .collect(Collectors.toList());
        invoice.getItems().addAll(newItems);

        BigDecimal subtotal = newItems.stream()
            .map(item -> item.getUnitPrice().multiply(new BigDecimal(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal taxRate = newItems.stream()
            .map(InvoiceItem::getTaxRate).filter(r -> r != null)
            .max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal taxAmount = subtotal.multiply(taxRate.divide(new BigDecimal("100")));
        invoice.setSubtotal(subtotal);
        invoice.setTaxRate(taxRate);
        invoice.setTaxAmount(taxAmount);
        invoice.setTotal(subtotal.add(taxAmount));

        Invoice.InvoiceStatus st = invoice.getStatus();
        if (st == Invoice.InvoiceStatus.DRAFT)           invoice.setWatermark("DRAFT");
        else if (st == Invoice.InvoiceStatus.CANCELLED)  invoice.setWatermark("CANCELLED");
        else                                             invoice.setWatermark("CONFIDENTIAL");

        return toDTO(invoiceRepository.save(invoice));
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
        String prefix = "INV-" + year + "-";
        long next = invoiceRepository.findMaxInvoiceNumberWithPrefix(prefix)
            .map(max -> {
                try { return Long.parseLong(max.substring(prefix.length())) + 1; }
                catch (NumberFormatException e) { return 1L; }
            })
            .orElse(1L);
        return prefix + String.format("%03d", next);
    }

    private InvoiceDTO toDTO(Invoice invoice) {
        return InvoiceDTO.builder()
            .id(invoice.getId())
            .invoiceNumber(invoice.getInvoiceNumber())
            .workOrderId(invoice.getWorkOrderId())
            .clientId(invoice.getClientId())
            .billToName(invoice.getBillToName())
            .billToEmail(invoice.getBillToEmail())
            .billToPhone(invoice.getBillToPhone())
            .billToAddress(invoice.getBillToAddress())
            .billToCompany(invoice.getBillToCompany())
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
            Document document = new Document(PageSize.A4, 40, 40, 40, 82);
            PdfWriter pdfWriter = PdfWriter.getInstance(document, byteArrayOutputStream);

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
                pdfWriter.setPageEvent(new InvoicePageEvent(wmarkImg, wmarkBf, arabicBf, invoice.getNotes()));
            } catch (Exception ignored) {}
            document.open();

            // ── Colors ──────────────────────────────────────────────────────────
            Color primaryBlue   = new Color(46, 91, 168);
            Color headerBg      = new Color(210, 225, 245);
            Color tableHeaderBg = new Color(70, 100, 150);
            Color billToBg      = new Color(232, 232, 232);
            Color altRowBg      = new Color(248, 248, 248);


            // ── Standard fonts ───────────────────────────────────────────────────

            Font normalFont       = new Font(Font.HELVETICA,  9, Font.NORMAL);
            Font boldFont         = new Font(Font.HELVETICA,  9, Font.BOLD);
            Font smallFont        = new Font(Font.HELVETICA,  8, Font.NORMAL);
            Font tableHdrFont     = new Font(Font.HELVETICA,  9, Font.BOLD, Color.WHITE);
            Font totalBoldFont    = new Font(Font.HELVETICA, 10, Font.BOLD, primaryBlue);
            Font footerFont       = new Font(Font.HELVETICA,  7, Font.NORMAL);

            // ── Arabic font (reuse the BaseFont pre-loaded for the page event) ────
            Font arabicFont     = arabicBf != null ? new Font(arabicBf, 8, Font.NORMAL) : smallFont;
            Font arabicBoldFont = arabicBf != null ? new Font(arabicBf, 8, Font.BOLD)   : boldFont;

            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            java.text.NumberFormat nf = java.text.NumberFormat.getNumberInstance();
            nf.setMinimumFractionDigits(2);
            nf.setMaximumFractionDigits(2);

            // ── 1 & 2. ELEGANT HEADER ────────────────────────────────────────────
            // Left (blue): white logo + company name/tagline
            // Right (white): large INVOICE title + accent line + invoice details
            Color deepBlue    = new Color(28, 57, 110);
            Color accentGold  = new Color(180, 148, 75);
            Font  titleBig    = new Font(Font.HELVETICA, 34, Font.BOLD,   deepBlue);
            Font  labelGray   = new Font(Font.HELVETICA,  8, Font.BOLD,   new Color(120, 120, 120));

            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{12, 88});
            headerTable.setSpacingAfter(0);

            // ── Left cell: logo on white (transparency pre-baked in BrandingAssetLoader) ──
            PdfPCell logoHdrCell = new PdfPCell();
            logoHdrCell.setBackgroundColor(Color.WHITE);
            logoHdrCell.setBorder(Rectangle.NO_BORDER);
            logoHdrCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            logoHdrCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            logoHdrCell.setPadding(4);
            Image logoImage = null;
            if (invoice.getLogoUrl() != null && !invoice.getLogoUrl().isBlank()) {
                try { logoImage = Image.getInstance(invoice.getLogoUrl()); } catch (Exception ignored) {}
            }
            if (logoImage == null) logoImage = BrandingAssetLoader.loadLogo();
            if (logoImage != null) {
                logoImage.scaleToFit(62, 92);
                logoImage.setAlignment(Image.ALIGN_CENTER);
                logoHdrCell.addElement(logoImage);
            }
            headerTable.addCell(logoHdrCell);

            // ── Right cell: white, INVOICE title + accent bar + details ──────────
            PdfPCell rightCell = new PdfPCell();
            rightCell.setBackgroundColor(Color.WHITE);
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setPaddingTop(18);
            rightCell.setPaddingBottom(14);
            rightCell.setPaddingLeft(22);
            rightCell.setPaddingRight(16);
            rightCell.setVerticalAlignment(Element.ALIGN_TOP);

            rightCell.addElement(new Paragraph("INVOICE", titleBig));

            // Thin gold accent bar
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

            // Invoice details grid: label | value
            PdfPTable detailsGrid = new PdfPTable(2);
            detailsGrid.setWidthPercentage(100);
            detailsGrid.setWidths(new float[]{30, 70});
            String issueStr = invoice.getIssueDate() != null ? invoice.getIssueDate().format(dateFmt) : "-";
            String dueStr   = invoice.getDueDate()   != null ? invoice.getDueDate().format(dateFmt)   : "-";
            for (String[] row : new String[][]{
                    {"Invoice No.", invoice.getInvoiceNumber()},
                    {"Date",        issueStr},
                    {"Due Date",    dueStr}}) {
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

            // ── Slim contact strip below header ───────────────────────────────────
            PdfPTable contactStrip = new PdfPTable(3);
            contactStrip.setWidthPercentage(100);
            contactStrip.setWidths(new float[]{34, 33, 33});
            contactStrip.setSpacingBefore(0);
            contactStrip.setSpacingAfter(10);
            Color stripBg = new Color(240, 244, 252);
            for (String[] item : new String[][]{
                    {"Qatar, Doha"},
                    {"+974 709 709 17"},
                    {"rigoomarine@gmail.com"}}) {
                PdfPCell cc = new PdfPCell(new Phrase(item[0], smallFont));
                cc.setBackgroundColor(stripBg);
                cc.setBorder(Rectangle.NO_BORDER);
                cc.setPadding(5);
                cc.setPaddingLeft(10);
                contactStrip.addCell(cc);
            }
            document.add(contactStrip);

            // ── 3. BILL TO BAR ───────────────────────────────────────────────────
            String clientDisplay = invoice.getBillToName() != null ? invoice.getBillToName()
                    : (invoice.getClientId() != null ? "Client #" + invoice.getClientId() : "");
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

            // ── QR CODE (dashed box, right-aligned) ──────────────────────────────
            if (invoice.getQrCode() != null && !invoice.getQrCode().isBlank()) {
                PdfPTable qrTable = new PdfPTable(1);
                qrTable.setWidthPercentage(30);
                qrTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
                qrTable.setSpacingAfter(6);
                PdfPCell qrCell = new PdfPCell(new Phrase(invoice.getQrCode(),
                        new Font(Font.COURIER, 10, Font.BOLD)));
                qrCell.setBorder(Rectangle.BOX);
                qrCell.setBorderColor(new Color(153, 153, 153));
                qrCell.setPadding(6);
                qrCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                qrTable.addCell(qrCell);
                document.add(qrTable);
            }

            // ── 4. LINE ITEMS TABLE ──────────────────────────────────────────────
            PdfPTable itemsTable = new PdfPTable(4);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{46, 10, 22, 22});
            itemsTable.setSpacingAfter(14);

            String[] colHdrs = {"Description", "Qty", "Unit Price", "Amount"};
            for (String h : colHdrs) {
                PdfPCell hc = new PdfPCell(new Phrase(h, tableHdrFont));
                hc.setBackgroundColor(tableHeaderBg);
                hc.setBorder(Rectangle.NO_BORDER);
                hc.setPadding(6);
                hc.setHorizontalAlignment(h.equals("Description") ? Element.ALIGN_LEFT : Element.ALIGN_RIGHT);
                itemsTable.addCell(hc);
            }

            boolean alt = false;
            for (InvoiceItem item : invoice.getItems()) {
                Color rowBg = alt ? altRowBg : Color.WHITE;
                pdfItemCell(itemsTable, item.getDescription(), normalFont, rowBg, Element.ALIGN_LEFT);
                pdfItemCell(itemsTable, String.valueOf(item.getQuantity()), normalFont, rowBg, Element.ALIGN_RIGHT);
                pdfItemCell(itemsTable, "QAR " + nf.format(item.getUnitPrice()), normalFont, rowBg, Element.ALIGN_RIGHT);
                pdfItemCell(itemsTable, "QAR " + nf.format(item.getAmount()), normalFont, rowBg, Element.ALIGN_RIGHT);
                alt = !alt;
            }
            document.add(itemsTable);

            // ── 5. BOTTOM: TERMS | STAMP | TOTALS ───────────────────────────────
            PdfPTable bottomTable = new PdfPTable(3);
            bottomTable.setWidthPercentage(100);
            bottomTable.setWidths(new float[]{38, 24, 38});
            bottomTable.setSpacingAfter(8);

            // Left — Payment Terms
            PdfPCell termsCell = new PdfPCell();
            termsCell.setBorder(Rectangle.NO_BORDER);
            termsCell.setPadding(4);
            Paragraph termsPara = new Paragraph();
            termsPara.add(new Chunk("Payment Terms\n", boldFont));
            if (invoice.getTerms() != null && !invoice.getTerms().isBlank()) {
                termsPara.add(new Chunk("Important Notes\n", boldFont));
                for (String line : invoice.getTerms().split("\n")) {
                    if (!line.isBlank()) termsPara.add(new Chunk(line.trim() + "\n", smallFont));
                }
            }
            termsCell.addElement(termsPara);
            if (invoice.getTermsArabic() != null && !invoice.getTermsArabic().isBlank()) {
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
                for (String line : invoice.getTermsArabic().split("\n")) {
                    if (!line.isBlank()) arPara.add(new Chunk(line.trim() + "\n", arabicFont));
                }
                arabicInner.addElement(arPara);
                arabicWrapper.addCell(arabicInner);
                termsCell.addElement(arabicWrapper);
            }
            bottomTable.addCell(termsCell);

            // Center — empty spacer
            PdfPCell stampCell = new PdfPCell();
            stampCell.setBorder(Rectangle.NO_BORDER);
            bottomTable.addCell(stampCell);

            // Right — Totals
            PdfPCell totalsOuterCell = new PdfPCell();
            totalsOuterCell.setBorder(Rectangle.NO_BORDER);
            totalsOuterCell.setPadding(2);
            PdfPTable totalsInner = new PdfPTable(2);
            totalsInner.setWidthPercentage(100);
            addTotalsRow(totalsInner, "Subtotal",             "QAR " + nf.format(invoice.getSubtotal()),  normalFont, normalFont);
            addTotalsRow(totalsInner, "Subtotal less Discount","QAR " + nf.format(invoice.getSubtotal()),  normalFont, normalFont);
            addTotalsRow(totalsInner, "Tax Rate",              invoice.getTaxRate() + "%",                   normalFont, normalFont);
            addTotalsRow(totalsInner, "Total Tax",             "QAR " + nf.format(invoice.getTaxAmount()), normalFont, normalFont);
            // Total row
            PdfPCell tlLabel = new PdfPCell(new Phrase("Total", boldFont));
            tlLabel.setBorder(Rectangle.TOP); tlLabel.setBorderWidthTop(1.5f);
            tlLabel.setPadding(5); tlLabel.setHorizontalAlignment(Element.ALIGN_LEFT);
            totalsInner.addCell(tlLabel);
            PdfPCell tlValue = new PdfPCell(new Phrase("QAR " + nf.format(invoice.getTotal()), totalBoldFont));
            tlValue.setBorder(Rectangle.TOP); tlValue.setBorderWidthTop(1.5f);
            tlValue.setPadding(5); tlValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalsInner.addCell(tlValue);
            totalsOuterCell.addElement(totalsInner);
            bottomTable.addCell(totalsOuterCell);
            document.add(bottomTable);

            // ── 6. AUTHORIZED SIGNATURE (stamp drawn behind text via cell event) ───
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
            return byteArrayOutputStream.toByteArray();
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

    private static void addTotalsRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell lc = new PdfPCell(new Phrase(label, labelFont));
        lc.setBorder(Rectangle.NO_BORDER);
        lc.setPadding(4);
        lc.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(lc);
        PdfPCell vc = new PdfPCell(new Phrase(value, valueFont));
        vc.setBorder(Rectangle.NO_BORDER);
        vc.setPadding(4);
        vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
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

    private static class InvoicePageEvent extends PdfPageEventHelper {
        private final Image watermarkImage;
        private final BaseFont bf;
        private final BaseFont arabicBf;
        private final String notes;
        private final float wmarkOrigW;
        private final float wmarkOrigH;
        private PdfTemplate pageCountTemplate;

        private static final String COMPLIANCE_EN =
            "This invoice is issued in two languages (Arabic & English) per Qatari customs and commercial requirements.";
        private static final String COMPLIANCE_AR =
            "يُصدر هذه الفاتورة باللغتين العربية والإنجليزية وفقاً للأعراف والمتطلبات التجارية القطرية.";

        InvoicePageEvent(Image watermarkImage, BaseFont bf, BaseFont arabicBf, String notes) {
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
            // Gold top border
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
