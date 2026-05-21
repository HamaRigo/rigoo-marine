package com.rigoomarine.delivery.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
@RequiredArgsConstructor
@Slf4j
public class DeliveryEventPublisher {

    public static final String TOPIC = "delivery.status.v1";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishAfterCommit(DeliveryStatusChangeEvent event) {
        if (event == null) return;

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    doPublish(event);
                }
            });
        } else {
            log.warn("publishAfterCommit called outside a transaction — publishing immediately");
            doPublish(event);
        }
    }

    private void doPublish(DeliveryStatusChangeEvent event) {
        try {
            kafkaTemplate.send(TOPIC, String.valueOf(event.getTaskId()), event);
            log.info("Published DeliveryStatusChangeEvent taskId={} status={}",
                    event.getTaskId(), event.getStatus());
        } catch (Exception ex) {
            log.warn("Failed to publish DeliveryStatusChangeEvent taskId={}: {}",
                    event.getTaskId(), ex.getMessage());
        }
    }
}
