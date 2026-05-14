package com.rigoomarine.maintenance.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.rigoomarine.maintenance.dto.ServiceHistoryDTO;
import com.rigoomarine.maintenance.dto.ServiceScheduleDTO;
import com.rigoomarine.maintenance.dto.VesselMaintenanceSummaryDTO;
import com.rigoomarine.maintenance.entity.Urgency;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Renders the maintenance dossier as a printable PDF: vessel header, current
 * engine hours, recent service history, and the forward-looking schedule with
 * urgency colour-coding. Mirrors the OpenPDF idiom established by
 * {@code invoice-module/QuotationService}.
 *
 * <p>Locale support is plumbed end-to-end (controller param → label set) but
 * Arabic is currently emitted in English with a localised <em>title</em>
 * prefix. A full Arabic render needs a bundled Noto Sans Arabic font plus
 * BiDi-aware run direction on each PdfPTable — tracked separately because the
 * font binary is licensing-sensitive and adds ~280KB to the artifact.
 */
@Component
@Slf4j
public class MaintenanceDossierPdfRenderer {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private static final Color BRAND_PRIMARY = new Color(0, 105, 148);   // #006994
    private static final Color BRAND_DARK    = new Color(0, 66, 99);     // #004263
    private static final Color OVERDUE_RED   = new Color(211, 47, 47);
    private static final Color DUE_AMBER     = new Color(237, 108, 2);
    private static final Color MUTED         = new Color(120, 120, 120);

    public byte[] render(VesselMaintenanceSummaryDTO dossier, String vesselName, String locale) {
        if (dossier == null) throw new IllegalArgumentException("dossier required");
        boolean isAr = "ar".equalsIgnoreCase(locale);
        Labels L = isAr ? Labels.AR : Labels.EN;

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 54, 36);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Default fonts. Arabic glyphs that fall outside the default
            // encoding will appear as boxes — see class javadoc for the
            // bundled-font follow-up.
            Font titleFont    = new Font(Font.HELVETICA, 20, Font.BOLD,   BRAND_PRIMARY);
            Font sectionFont  = new Font(Font.HELVETICA, 13, Font.BOLD,   BRAND_DARK);
            Font normalFont   = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.BLACK);
            Font mutedFont    = new Font(Font.HELVETICA, 9,  Font.NORMAL, MUTED);
            Font boldFont     = new Font(Font.HELVETICA, 10, Font.BOLD,   Color.BLACK);

            renderHeader(document, dossier, vesselName, locale, L, titleFont, mutedFont);
            renderEngineHours(document, dossier, L, sectionFont, normalFont, mutedFont);
            renderSchedule(document, dossier, L, sectionFont, normalFont, boldFont);
            renderHistory(document, dossier, L, sectionFont, normalFont, mutedFont);
            renderFooter(document, L, mutedFont);

            document.close();
            return out.toByteArray();
        } catch (DocumentException e) {
            log.error("Failed to render dossier PDF for vessel {}", dossier.getVesselId(), e);
            throw new RuntimeException("PDF rendering failed", e);
        }
    }

    private void renderHeader(Document doc, VesselMaintenanceSummaryDTO dossier, String vesselName,
                              String locale, Labels L, Font titleFont, Font mutedFont) throws DocumentException {
        Paragraph title = new Paragraph(L.title + " — " + safe(vesselName, "#" + dossier.getVesselId()), titleFont);
        title.setSpacingAfter(4);
        doc.add(title);

        Paragraph meta = new Paragraph(
            L.generatedOn + " " + DATE_FMT.format(LocalDate.now())
                + "   ·   " + L.vesselId + " #" + dossier.getVesselId()
                + "   ·   " + L.locale + " " + (locale == null ? "en" : locale),
            mutedFont
        );
        meta.setSpacingAfter(14);
        doc.add(meta);

        doc.add(separator());
    }

    private void renderEngineHours(Document doc, VesselMaintenanceSummaryDTO dossier, Labels L,
                                   Font sectionFont, Font normalFont, Font mutedFont) throws DocumentException {
        Paragraph header = new Paragraph(L.engineHours, sectionFont);
        header.setSpacingBefore(10);
        header.setSpacingAfter(6);
        doc.add(header);

        if (dossier.isEngineHoursUnavailable()) {
            doc.add(new Paragraph(L.engineHoursUnavailable, mutedFont));
            return;
        }
        if (dossier.getCurrentEngineHours() == null) {
            doc.add(new Paragraph(L.engineHoursNone, mutedFont));
            return;
        }
        Paragraph hours = new Paragraph(
            dossier.getCurrentEngineHours().toPlainString() + " h"
                + (dossier.getEngineHoursUpdatedAt() == null
                    ? ""
                    : "   (" + L.updated + " " + dossier.getEngineHoursUpdatedAt() + ")"),
            normalFont
        );
        doc.add(hours);
    }

    private void renderSchedule(Document doc, VesselMaintenanceSummaryDTO dossier, Labels L,
                                Font sectionFont, Font normalFont, Font boldFont) throws DocumentException {
        Paragraph header = new Paragraph(L.schedule, sectionFont);
        header.setSpacingBefore(14);
        header.setSpacingAfter(6);
        doc.add(header);

        if (dossier.getSchedule() == null || dossier.getSchedule().isEmpty()) {
            doc.add(new Paragraph(L.scheduleEmpty, normalFont));
            return;
        }

        PdfPTable table = new PdfPTable(new float[] {3, 2, 2, 2, 2});
        table.setWidthPercentage(100);
        table.setSpacingBefore(2);

        headerCell(table, L.colService, boldFont);
        headerCell(table, L.colNextDue,  boldFont);
        headerCell(table, L.colDueHours, boldFont);
        headerCell(table, L.colInterval, boldFont);
        headerCell(table, L.colUrgency,  boldFont);

        for (ServiceScheduleDTO s : dossier.getSchedule()) {
            cell(table, s.getServiceType().name(), normalFont);
            cell(table, s.getNextDueDate() == null ? "—" : s.getNextDueDate().toString(), normalFont);
            cell(table, s.getNextDueHours() == null ? "—" : s.getNextDueHours().toPlainString() + " h", normalFont);
            String interval = String.join(" / ",
                s.getIntervalDays() == null ? null : s.getIntervalDays() + "d",
                s.getIntervalHours() == null ? null : s.getIntervalHours().toPlainString() + "h"
            ).replaceAll("(^|\\s)null(\\s|$)", "").trim();
            cell(table, interval.isEmpty() ? "—" : interval, normalFont);
            cell(table, urgencyLabel(s.getUrgency(), L),
                new Font(Font.HELVETICA, 10, Font.BOLD, urgencyColor(s.getUrgency())));
        }
        doc.add(table);
    }

    private void renderHistory(Document doc, VesselMaintenanceSummaryDTO dossier, Labels L,
                               Font sectionFont, Font normalFont, Font mutedFont) throws DocumentException {
        Paragraph header = new Paragraph(L.history, sectionFont);
        header.setSpacingBefore(14);
        header.setSpacingAfter(6);
        doc.add(header);

        if (dossier.getRecentHistory() == null || dossier.getRecentHistory().isEmpty()) {
            doc.add(new Paragraph(L.historyEmpty, mutedFont));
            return;
        }

        PdfPTable table = new PdfPTable(new float[] {2, 3, 2, 2, 4});
        table.setWidthPercentage(100);

        Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD, Color.BLACK);
        headerCell(table, L.colDate,      headerFont);
        headerCell(table, L.colService,   headerFont);
        headerCell(table, L.colHours,     headerFont);
        headerCell(table, L.colCost,      headerFont);
        headerCell(table, L.colNotes,     headerFont);

        for (ServiceHistoryDTO h : dossier.getRecentHistory()) {
            cell(table, h.getPerformedOn() == null ? "—" : h.getPerformedOn().toString(), normalFont);
            cell(table, h.getServiceType().name(), normalFont);
            cell(table, h.getEngineHoursAtService() == null ? "—" : h.getEngineHoursAtService().toPlainString() + " h", normalFont);
            cell(table, h.getCost() == null ? "—" : h.getCost().toPlainString() + " " + safe(h.getCurrency(), "QAR"), normalFont);
            cell(table, safe(h.getNotes(), ""), normalFont);
        }
        doc.add(table);
    }

    private void renderFooter(Document doc, Labels L, Font mutedFont) throws DocumentException {
        Paragraph footer = new Paragraph(L.footer, mutedFont);
        footer.setSpacingBefore(20);
        footer.setAlignment(Element.ALIGN_CENTER);
        doc.add(footer);
    }

    private Element separator() {
        PdfPTable line = new PdfPTable(1);
        line.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell();
        cell.setFixedHeight(1.5f);
        cell.setBackgroundColor(BRAND_PRIMARY);
        cell.setBorder(0);
        line.addCell(cell);
        return line;
    }

    private void headerCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(245, 247, 250));
        cell.setPadding(6);
        cell.setBorderColor(new Color(220, 220, 220));
        table.addCell(cell);
    }

    private void cell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        cell.setBorderColor(new Color(232, 232, 232));
        table.addCell(cell);
    }

    private Color urgencyColor(Urgency u) {
        if (u == null) return Color.BLACK;
        return switch (u) {
            case OVERDUE -> OVERDUE_RED;
            case DUE_SOON -> DUE_AMBER;
            case UPCOMING -> new Color(46, 125, 50);
        };
    }

    private String urgencyLabel(Urgency u, Labels L) {
        if (u == null) return "—";
        return switch (u) {
            case OVERDUE -> L.overdue;
            case DUE_SOON -> L.dueSoon;
            case UPCOMING -> L.upcoming;
        };
    }

    private static String safe(String v, String fallback) {
        return (v == null || v.isBlank()) ? fallback : v;
    }

    /**
     * Static label sets. Keeping the labels close to the renderer (instead of
     * a properties file) is intentional — PDFs are emitted infrequently, the
     * label set is small, and locality makes the bilingual coverage auditable
     * at a glance.
     */
    private static final class Labels {
        final String title;
        final String generatedOn, vesselId, locale;
        final String engineHours, engineHoursNone, engineHoursUnavailable, updated;
        final String schedule, scheduleEmpty;
        final String history, historyEmpty;
        final String colService, colNextDue, colDueHours, colInterval, colUrgency;
        final String colDate, colHours, colCost, colNotes;
        final String overdue, dueSoon, upcoming;
        final String footer;

        private Labels(String[] s) {
            this.title = s[0]; this.generatedOn = s[1]; this.vesselId = s[2]; this.locale = s[3];
            this.engineHours = s[4]; this.engineHoursNone = s[5]; this.engineHoursUnavailable = s[6]; this.updated = s[7];
            this.schedule = s[8]; this.scheduleEmpty = s[9];
            this.history = s[10]; this.historyEmpty = s[11];
            this.colService = s[12]; this.colNextDue = s[13]; this.colDueHours = s[14]; this.colInterval = s[15]; this.colUrgency = s[16];
            this.colDate = s[17]; this.colHours = s[18]; this.colCost = s[19]; this.colNotes = s[20];
            this.overdue = s[21]; this.dueSoon = s[22]; this.upcoming = s[23];
            this.footer = s[24];
        }

        static final Labels EN = new Labels(new String[] {
            "Vessel maintenance dossier",
            "Generated on", "Vessel", "Locale:",
            "Engine hours", "No reading on file.", "Engine-hours reading temporarily unavailable.", "updated",
            "Service schedule", "No scheduled services on file.",
            "Service history", "No services logged yet.",
            "Service", "Next due", "At hours", "Interval", "Status",
            "Date", "Engine hours", "Cost", "Notes",
            "OVERDUE", "DUE SOON", "Upcoming",
            "Generated by Rigoo Marine — keep with vessel documents."
        });

        static final Labels AR = new Labels(new String[] {
            "ملف صيانة السفينة",
            "تاريخ الإصدار", "السفينة", "اللغة:",
            "ساعات المحرك", "لا توجد قراءة مسجلة.", "قراءة ساعات المحرك غير متاحة مؤقتاً.", "آخر تحديث",
            "جدول الصيانة", "لا توجد خدمات مجدولة.",
            "سجل الخدمات", "لم يتم تسجيل أي خدمات بعد.",
            "الخدمة", "الموعد التالي", "عند ساعات", "الفترة", "الحالة",
            "التاريخ", "ساعات المحرك", "التكلفة", "ملاحظات",
            "متأخرة", "قريباً", "قادمة",
            "تم إنشاؤه بواسطة Rigoo Marine — احتفظ به مع وثائق السفينة."
        });
    }
}
