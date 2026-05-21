package com.rigoomarine.vessel.service;

import com.rigoomarine.common.security.SecurityUtils;
import com.rigoomarine.vessel.dto.CreateFuelLogRequest;
import com.rigoomarine.vessel.dto.FuelAnalyticsDTO;
import com.rigoomarine.vessel.dto.FuelLogDTO;
import com.rigoomarine.vessel.entity.FuelLog;
import com.rigoomarine.vessel.exception.VesselNotFoundException;
import com.rigoomarine.vessel.repository.FuelLogRepository;
import com.rigoomarine.vessel.repository.VesselRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FuelLogService {

    private final FuelLogRepository fuelLogRepository;
    private final VesselRepository  vesselRepository;
    private final VesselSecurity    vesselSecurity;

    @Transactional(readOnly = true)
    public Page<FuelLogDTO> listForVessel(Long vesselId, Pageable pageable) {
        assertExists(vesselId);
        vesselSecurity.assertCanAccess(vesselId);
        return fuelLogRepository.findByVesselIdOrderByLogDateDescIdDesc(vesselId, pageable)
            .map(this::toDTO);
    }

    public FuelLogDTO addLog(Long vesselId, CreateFuelLogRequest request) {
        assertExists(vesselId);
        vesselSecurity.assertCanAccess(vesselId);

        Long clientId = SecurityUtils.currentClientIdOrThrow();

        // Compute totalCost from liters * price if not explicitly provided
        BigDecimal cost = request.getTotalCost();
        if (cost == null && request.getPricePerLiter() != null) {
            cost = request.getLitersAdded()
                .multiply(request.getPricePerLiter())
                .setScale(2, RoundingMode.HALF_UP);
        }

        FuelLog log = FuelLog.builder()
            .vesselId(vesselId)
            .clientId(clientId)
            .logDate(request.getLogDate())
            .litersAdded(request.getLitersAdded())
            .pricePerLiter(request.getPricePerLiter())
            .totalCost(cost)
            .currency(request.getCurrency() != null ? request.getCurrency() : "QAR")
            .engineHoursAtFuel(request.getEngineHoursAtFuel())
            .portName(request.getPortName())
            .notes(request.getNotes())
            .build();

        return toDTO(fuelLogRepository.save(log));
    }

    public void deleteLog(Long logId) {
        Long clientId = SecurityUtils.currentClientIdOrThrow();
        boolean isAdmin = SecurityUtils.currentUser()
            .map(u -> u.hasRole("ADMIN")).orElse(false);

        FuelLog entry = isAdmin
            ? fuelLogRepository.findById(logId).orElseThrow(() -> notFound(logId))
            : fuelLogRepository.findByIdAndClientId(logId, clientId).orElseThrow(() -> notFound(logId));

        logAdminMutation(logId, entry.getClientId(), "DELETE_FUEL_LOG");
        fuelLogRepository.delete(entry);
    }

    @Transactional(readOnly = true)
    public FuelAnalyticsDTO analytics(Long vesselId, int year) {
        assertExists(vesselId);
        vesselSecurity.assertCanAccess(vesselId);

        List<FuelLog> logs = fuelLogRepository.findByVesselIdAndYear(vesselId, year);

        // Group by month
        Map<Integer, List<FuelLog>> byMonth = logs.stream()
            .collect(Collectors.groupingBy(l -> l.getLogDate().getMonthValue()));

        List<FuelAnalyticsDTO.MonthlyFuelDTO> monthlyData = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            List<FuelLog> monthLogs = byMonth.getOrDefault(m, List.of());
            BigDecimal liters = monthLogs.stream()
                .map(FuelLog::getLitersAdded)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal cost = monthLogs.stream()
                .map(l -> l.getTotalCost() != null ? l.getTotalCost() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            monthlyData.add(FuelAnalyticsDTO.MonthlyFuelDTO.builder()
                .month(m).liters(liters).cost(cost).fills(monthLogs.size()).build());
        }

        BigDecimal totalLiters = logs.stream().map(FuelLog::getLitersAdded)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCost = logs.stream()
            .map(l -> l.getTotalCost() != null ? l.getTotalCost() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return FuelAnalyticsDTO.builder()
            .vesselId(vesselId)
            .year(year)
            .totalLiters(totalLiters)
            .totalCost(totalCost)
            .currency("QAR")
            .recordCount(logs.size())
            .byMonth(monthlyData)
            .build();
    }

    // ── Mapper ─────────────────────────────────────────────────────────────

    private FuelLogDTO toDTO(FuelLog l) {
        return FuelLogDTO.builder()
            .id(l.getId())
            .vesselId(l.getVesselId())
            .logDate(l.getLogDate())
            .litersAdded(l.getLitersAdded())
            .pricePerLiter(l.getPricePerLiter())
            .totalCost(l.getTotalCost())
            .currency(l.getCurrency())
            .engineHoursAtFuel(l.getEngineHoursAtFuel())
            .portName(l.getPortName())
            .notes(l.getNotes())
            .createdAt(l.getCreatedAt())
            .build();
    }

    private void assertExists(Long vesselId) {
        if (!vesselRepository.existsById(vesselId)) throw new VesselNotFoundException(vesselId);
    }

    private ResponseStatusException notFound(Long id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Fuel log not found: " + id);
    }

    private void logAdminMutation(Long id, Long ownerId, String op) {
        SecurityUtils.currentUser().ifPresent(u -> {
            if (u.hasRole("ADMIN") && !ownerId.equals(u.getClientId())) {
                log.info("audit.admin_edit fuelLogId={} owner={} actor={} op={}", id, ownerId, u.getEmail(), op);
            }
        });
    }
}
