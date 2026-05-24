package com.rigoomarine.marketplace.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class ListingEventPublisher {

    static final String TOPIC = "listing-review-events";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishApproved(Long listingId, String titleEn, Long ownerClientId,
                                String reviewerEmail, String reviewerRole,
                                java.math.BigDecimal companyGainPct) {
        publish("LISTING_APPROVED", listingId, titleEn, ownerClientId,
                reviewerEmail, reviewerRole, companyGainPct, null);
    }

    public void publishRejected(Long listingId, String titleEn, Long ownerClientId,
                                String reviewerEmail, String reviewerRole, String reason) {
        publish("LISTING_REJECTED", listingId, titleEn, ownerClientId,
                reviewerEmail, reviewerRole, null, reason);
    }

    private void publish(String eventType, Long listingId, String titleEn, Long ownerClientId,
                         String reviewerEmail, String reviewerRole,
                         java.math.BigDecimal companyGainPct, String rejectionReason) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType",       eventType);
        event.put("listingId",       listingId);
        event.put("listingTitleEn",  titleEn);
        event.put("ownerClientId",   ownerClientId);
        event.put("reviewerEmail",   reviewerEmail);
        event.put("reviewerRole",    reviewerRole);
        event.put("companyGainPct",  companyGainPct != null ? companyGainPct.toString() : null);
        event.put("rejectionReason", rejectionReason);
        event.put("timestamp",       LocalDateTime.now().toString());

        try {
            kafkaTemplate.send(TOPIC, String.valueOf(listingId), event);
            log.info("Published {} for listingId={} by {}({})", eventType, listingId, reviewerEmail, reviewerRole);
        } catch (Exception ex) {
            log.warn("Failed to publish {} for listingId={}: {}", eventType, listingId, ex.getMessage());
        }
    }
}
