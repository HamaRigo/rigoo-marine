package com.rigoomarine.maintenance.service;

import com.rigoomarine.maintenance.dto.ServiceHistoryDTO;
import com.rigoomarine.maintenance.dto.ServiceScheduleDTO;
import com.rigoomarine.maintenance.dto.VesselMaintenanceSummaryDTO;
import com.rigoomarine.maintenance.entity.ScheduleStatus;
import com.rigoomarine.maintenance.entity.ServiceType;
import com.rigoomarine.maintenance.entity.Urgency;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Smoke + behaviour tests for the PDF renderer. We don't parse the output —
 * that needs a full PDF reader. Instead we assert:
 * <ul>
 *   <li>Output is a non-empty byte array starting with the PDF magic.</li>
 *   <li>Empty dossiers (no history, no schedule) still render — defensive
 *       belt against NPEs in the empty-state branches.</li>
 *   <li>The vessel-hours-unavailable banner doesn't trip the renderer.</li>
 *   <li>The locale parameter doesn't blow up the renderer for either EN or AR
 *       (full Arabic glyph rendering needs a real font on the system, not
 *       exercised here — the renderer falls back to Helvetica gracefully).</li>
 * </ul>
 */
class MaintenanceDossierPdfRendererTest {

    private MaintenanceDossierPdfRenderer renderer;

    @BeforeEach
    void setUp() {
        renderer = new MaintenanceDossierPdfRenderer();
        // Force Arabic-font loading off so tests don't depend on local fonts.
        ReflectionTestUtils.setField(renderer, "arabicFontPath", "");
    }

    @Test
    void rendersNonEmptyPdf_forFullyPopulatedDossier() {
        VesselMaintenanceSummaryDTO dossier = VesselMaintenanceSummaryDTO.builder()
            .vesselId(42L)
            .currentEngineHours(new BigDecimal("245.0"))
            .engineHoursUpdatedAt(Instant.parse("2026-05-14T10:00:00Z"))
            .engineHoursUnavailable(false)
            .recentHistory(List.of(
                ServiceHistoryDTO.builder()
                    .id(1L).vesselId(42L).clientId(7L)
                    .serviceType(ServiceType.OIL_CHANGE)
                    .performedOn(LocalDate.of(2026, 5, 14))
                    .engineHoursAtService(new BigDecimal("245.0"))
                    .cost(new BigDecimal("280.00")).currency("QAR")
                    .notes("Filter + sump")
                    .build()
            ))
            .schedule(List.of(
                ServiceScheduleDTO.builder()
                    .id(1L).vesselId(42L)
                    .serviceType(ServiceType.OIL_CHANGE)
                    .intervalDays(180).intervalHours(new BigDecimal("100.0"))
                    .nextDueDate(LocalDate.of(2026, 11, 10))
                    .nextDueHours(new BigDecimal("345.0"))
                    .status(ScheduleStatus.ACTIVE)
                    .urgency(Urgency.UPCOMING)
                    .build()
            ))
            .build();

        byte[] pdf = renderer.render(dossier, "Al Bahar", "en");

        assertThat(pdf).isNotEmpty();
        assertThat(pdfHeader(pdf)).isEqualTo("%PDF-");
    }

    @Test
    void rendersEmptyDossier_withoutBlowingUp() {
        // Defensive belt — new clients with no vessel state should still get
        // a PDF (just empty sections + the localised "no entries" copy).
        VesselMaintenanceSummaryDTO dossier = VesselMaintenanceSummaryDTO.builder()
            .vesselId(7L)
            .recentHistory(List.of())
            .schedule(List.of())
            .build();

        byte[] pdf = renderer.render(dossier, null, "en");
        assertThat(pdf).isNotEmpty();
    }

    @Test
    void rendersDegradedDossier_whenEngineHoursUnavailable() {
        VesselMaintenanceSummaryDTO dossier = VesselMaintenanceSummaryDTO.builder()
            .vesselId(42L)
            .engineHoursUnavailable(true)
            .recentHistory(List.of())
            .schedule(List.of())
            .build();

        byte[] pdf = renderer.render(dossier, "Al Bahar", "en");
        assertThat(pdf).isNotEmpty();
    }

    @Test
    void rendersArabicLocale_evenWithoutBundledFont() {
        // Arabic font path is explicitly empty in setUp(); renderer must
        // fall back to Helvetica with a WARN, not throw.
        VesselMaintenanceSummaryDTO dossier = VesselMaintenanceSummaryDTO.builder()
            .vesselId(42L)
            .recentHistory(List.of())
            .schedule(List.of())
            .build();

        byte[] pdf = renderer.render(dossier, "السفينة", "ar");
        assertThat(pdf).isNotEmpty();
    }

    private static String pdfHeader(byte[] pdf) {
        if (pdf.length < 5) return "";
        return new String(pdf, 0, 5);
    }
}
