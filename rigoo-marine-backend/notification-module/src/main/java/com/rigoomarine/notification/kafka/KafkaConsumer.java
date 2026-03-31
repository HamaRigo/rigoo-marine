package com.rigoomarine.notification.kafka;

import com.rigoomarine.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaConsumer {

    private final NotificationService notificationService;

    @KafkaListener(topics = "work-order-events", groupId = "notification-group")
    public void consumeWorkOrderEvent(Object event) {
        log.info("Received work order event: {}", event);
        // Process event and create notification
        notificationService.processWorkOrderEvent(event);
    }
}
