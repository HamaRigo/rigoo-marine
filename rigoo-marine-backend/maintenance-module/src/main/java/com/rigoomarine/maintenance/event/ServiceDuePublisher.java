package com.rigoomarine.maintenance.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ServiceDuePublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.maintenance.kafka.topic:maintenance.service-due.v1}")
    private String topic;

    /**
     * Fire-and-monitor: any partition-level send failure logs and is swallowed
     * so one bad partition doesn't poison the whole sweep. The reminder
     * scheduler will retry the same item next cycle (lastNotifiedAt is only
     * advanced on success — see {@code ServiceDueScheduler}).
     */
    public boolean publish(ServiceDueEvent event) {
        try {
            String key = event.getVesselId() + ":" + event.getServiceType();
            kafkaTemplate.send(topic, key, event).get();
            return true;
        } catch (Exception ex) {
            log.warn("Failed to publish ServiceDueEvent vessel={} type={}: {}",
                event.getVesselId(), event.getServiceType(), ex.getMessage());
            return false;
        }
    }
}
