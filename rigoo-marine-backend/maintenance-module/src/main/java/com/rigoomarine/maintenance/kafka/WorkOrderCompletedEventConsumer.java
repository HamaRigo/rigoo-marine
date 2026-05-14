package com.rigoomarine.maintenance.kafka;

import com.rigoomarine.maintenance.service.WorkOrderCompletionHandler;
import com.rigoomarine.maintenance.service.WorkOrderCompletionHandler.WorkOrderCompletionEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Consumes {@code workorder.completed.v1} events from work-order-module and
 * delegates to {@link WorkOrderCompletionHandler} to create the matching
 * history rows.
 *
 * <p>Deserialised as {@code Map<String,Object>} — keeps maintenance-module
 * decoupled from work-order-module's class-path (matches the established
 * ShopOrderEventConsumer pattern).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkOrderCompletedEventConsumer {

    private final WorkOrderCompletionHandler handler;

    @KafkaListener(topics = "workorder.completed.v1", groupId = "maintenance-workorders")
    public void onCompleted(Map<String, Object> event) {
        if (event == null) {
            log.warn("Null WorkOrderCompletedEvent received — ignoring");
            return;
        }
        try {
            WorkOrderCompletionEvent ev = adapt(event);
            handler.handle(ev);
        } catch (Exception ex) {
            log.error("Failed to process WorkOrderCompletedEvent {}: {}",
                event.get("workOrderId"), ex.getMessage(), ex);
            // Rethrow so the Kafka container's retry/error-handler kicks in.
            throw ex;
        }
    }

    @SuppressWarnings("unchecked")
    private WorkOrderCompletionEvent adapt(Map<String, Object> event) {
        Long workOrderId = asLong(event.get("workOrderId"));
        Long clientId = asLong(event.get("clientId"));
        Long vesselId = asLong(event.get("vesselId"));
        Long technicianId = asLong(event.get("technicianId"));
        LocalDateTime completedAt = parseLocalDateTime(event.get("completedAt"));

        Set<Long> serviceIds = new HashSet<>();
        Object idsObj = event.get("serviceIds");
        if (idsObj instanceof Iterable<?> it) {
            for (Object id : it) {
                Long v = asLong(id);
                if (v != null) serviceIds.add(v);
            }
        }

        List<String> serviceNames = new ArrayList<>();
        Object namesObj = event.get("serviceNames");
        if (namesObj instanceof Iterable<?> it) {
            for (Object n : it) {
                if (n != null) serviceNames.add(String.valueOf(n));
            }
        }

        String issueCategory = event.get("issueCategory") == null
            ? null
            : String.valueOf(event.get("issueCategory"));
        String notes = event.get("notes") == null
            ? null
            : String.valueOf(event.get("notes"));

        return new WorkOrderCompletionEvent(
            workOrderId, clientId, vesselId, technicianId, completedAt,
            serviceIds, serviceNames, issueCategory, notes
        );
    }

    private static Long asLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return null; }
    }

    @SuppressWarnings("unchecked")
    private static LocalDateTime parseLocalDateTime(Object v) {
        if (v == null) return null;
        if (v instanceof LocalDateTime ldt) return ldt;
        // Spring's JsonDeserializer renders java.time.LocalDateTime as
        // [year, month, day, hour, minute, second, nano] when type-headers are off.
        if (v instanceof List<?> arr && arr.size() >= 5) {
            try {
                int year = ((Number) arr.get(0)).intValue();
                int month = ((Number) arr.get(1)).intValue();
                int day = ((Number) arr.get(2)).intValue();
                int hour = ((Number) arr.get(3)).intValue();
                int minute = ((Number) arr.get(4)).intValue();
                int second = arr.size() > 5 ? ((Number) arr.get(5)).intValue() : 0;
                return LocalDateTime.of(year, month, day, hour, minute, second);
            } catch (Exception ignored) { /* fall through */ }
        }
        try {
            return LocalDateTime.parse(v.toString());
        } catch (Exception ignored) {
            return null;
        }
    }
}
