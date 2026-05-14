package com.rigoomarine.workorder.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Publishes work-order lifecycle events to Kafka — currently the {@code COMPLETED}
 * transition, consumed by maintenance-module to auto-create history rows.
 *
 * <p>Publish-after-commit: callers invoke {@link #publishAfterCommit} inside the
 * service transaction. The actual {@code KafkaTemplate.send} runs only once the
 * DB commit succeeds, avoiding "ghost events" when the WO save rolls back. If
 * Kafka is unavailable at that point the event is silently dropped (logged at
 * WARN) — the WO state is already persisted, so an operator can re-trigger by
 * toggling the status if it really matters.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WorkOrderEventPublisher {

    static final String TOPIC = "workorder.completed.v1";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishAfterCommit(WorkOrderCompletedEvent event) {
        if (event == null) return;

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    doPublish(event);
                }
            });
        } else {
            // Defensive: caller forgot @Transactional. Publish immediately so
            // we don't silently lose the event during integration tests.
            log.warn("publishAfterCommit called outside a transaction — publishing immediately");
            doPublish(event);
        }
    }

    private void doPublish(WorkOrderCompletedEvent event) {
        try {
            String key = event.getVesselId() + ":" + event.getWorkOrderId();
            kafkaTemplate.send(TOPIC, key, event);
            log.info("Published WorkOrderCompletedEvent workOrderId={} vesselId={}",
                event.getWorkOrderId(), event.getVesselId());
        } catch (Exception ex) {
            log.warn("Failed to publish WorkOrderCompletedEvent workOrderId={}: {}",
                event.getWorkOrderId(), ex.getMessage());
        }
    }
}
