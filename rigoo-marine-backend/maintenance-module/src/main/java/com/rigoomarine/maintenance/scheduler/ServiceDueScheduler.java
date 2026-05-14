package com.rigoomarine.maintenance.scheduler;

import com.rigoomarine.maintenance.event.ServiceDueEvent;
import com.rigoomarine.maintenance.event.ServiceDuePublisher;
import com.rigoomarine.maintenance.service.ServiceDueDetector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Wakes up nightly to sweep due maintenance, publishes one {@link ServiceDueEvent}
 * per surfaced item, and advances {@code lastNotifiedAt} for items that
 * published successfully. Skips entirely when {@code app.maintenance.reminders.enabled=false}.
 *
 * <p>Concurrency: the SQL sweep uses {@code FOR UPDATE SKIP LOCKED} so multiple
 * replicas can run in parallel without double-publishing. Each transaction
 * locks the rows it processes for its lifetime — sweep + publish + mark
 * happen inside the detector's @Transactional boundary.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ServiceDueScheduler {

    private final ServiceDueDetector detector;
    private final ServiceDuePublisher publisher;

    @Value("${app.maintenance.reminders.enabled:true}")
    private boolean enabled;

    @Scheduled(
        cron = "${app.maintenance.reminders.cron:0 0 3 * * *}",
        zone = "${app.maintenance.reminders.zone:Asia/Qatar}"
    )
    public void sweep() {
        if (!enabled) {
            log.debug("maintenance.reminders.enabled=false — skipping sweep");
            return;
        }

        List<ServiceDueDetector.DueItem> due = detector.sweep();
        if (due.isEmpty()) {
            log.info("maintenance sweep: no due items");
            return;
        }

        int published = 0;
        for (ServiceDueDetector.DueItem item : due) {
            ServiceDueEvent event = ServiceDueEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("ServiceDueEvent")
                .occurredAt(Instant.now())
                .clientId(item.item().getClientId())
                .vesselId(item.item().getVesselId())
                .serviceType(item.item().getServiceType())
                .urgency(item.urgency())
                .nextDueDate(item.item().getNextDueDate())
                .nextDueHours(item.item().getNextDueHours())
                .currentHours(item.currentHours())
                .daysUntilDue(item.daysUntilDue())
                .hoursUntilDue(item.hoursUntilDue())
                .build();

            if (publisher.publish(event)) {
                detector.markNotified(item.item());
                published++;
            }
        }
        log.info("maintenance sweep: {} candidates, {} published", due.size(), published);
    }
}
