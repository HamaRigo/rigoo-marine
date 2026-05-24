package com.rigoomarine.notification.kafka;

import com.rigoomarine.notification.entity.Notification;
import com.rigoomarine.notification.recipient.RecipientLookup;
import com.rigoomarine.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Consumes listing-review-events published by marketplace-module on every
 * approval or rejection. Sends two waves of notifications:
 *
 * 1. Owner (client who submitted): informed of the decision.
 * 2. Peer staff: if ADMIN reviewed → all TEAM_LEAD members notified;
 *    if TEAM_LEAD reviewed → all ADMIN members notified.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ListingReviewEventConsumer {

    private final NotificationRepository notificationRepository;
    private final RecipientLookup recipientLookup;
    private final EventDedupe eventDedupe;
    private final NotificationMetrics metrics;

    @KafkaListener(topics = "listing-review-events", groupId = "notification-listing-review")
    @Transactional
    public void onListingReviewEvent(Map<String, Object> event) {
        if (event == null) return;

        String eventType = str(event.get("eventType"));
        metrics.received(eventType).increment();

        if (!"LISTING_APPROVED".equals(eventType) && !"LISTING_REJECTED".equals(eventType)) {
            log.debug("Ignoring listing event type {}", eventType);
            return;
        }

        Long listingId    = asLong(event.get("listingId"));
        Long ownerClientId = asLong(event.get("ownerClientId"));
        String titleEn    = str(event.get("listingTitleEn"));
        String reviewerEmail = str(event.get("reviewerEmail"));
        String reviewerRole  = str(event.get("reviewerRole"));
        String rejectionReason = str(event.get("rejectionReason"));

        String dedupeKey = eventType + ":" + listingId;
        if (!eventDedupe.firstTime(dedupeKey)) {
            log.info("Listing event already processed key={} — skipping", dedupeKey);
            metrics.deduped(eventType).increment();
            return;
        }

        boolean approved = "LISTING_APPROVED".equals(eventType);

        // 1. Notify the listing owner
        if (ownerClientId != null) {
            saveNotification(ownerClientId,
                    approved ? ownerApprovedTitle("en") : ownerRejectedTitle("en"),
                    approved ? ownerApprovedMsg(titleEn, "en") : ownerRejectedMsg(titleEn, rejectionReason, "en"),
                    "/dashboard/my-listings");
        }

        // 2. Notify peers of the OTHER role
        String peerRole = "ADMIN".equalsIgnoreCase(reviewerRole) ? "TEAM_LEAD" : "ADMIN";
        List<RecipientLookup.Recipient> peers = recipientLookup.findAllByRole(peerRole);
        String peerTitle = approved ? peerApprovedTitle(reviewerRole, "en") : peerRejectedTitle(reviewerRole, "en");
        String peerMsg   = approved ? peerApprovedMsg(reviewerEmail, titleEn, "en")
                                    : peerRejectedMsg(reviewerEmail, titleEn, rejectionReason, "en");

        for (RecipientLookup.Recipient peer : peers) {
            saveNotification(peer.clientId(), peerTitle, peerMsg, "/admin/listings");
        }

        metrics.processed(eventType).increment();
        log.info("Processed {} listingId={} reviewer={}({}) peers={}",
                eventType, listingId, reviewerEmail, reviewerRole, peers.size());
    }

    private void saveNotification(Long clientId, String title, String message, String actionUrl) {
        notificationRepository.save(Notification.builder()
                .clientId(clientId)
                .type("LISTING_REVIEW")
                .title(title)
                .message(message)
                .actionUrl(actionUrl)
                .status(Notification.NotificationStatus.SENT)
                .channel("IN_APP")
                .read(false)
                .sentAt(LocalDateTime.now())
                .build());
    }

    // ── Owner messages ────────────────────────────────────────────────────────

    private static String ownerApprovedTitle(String locale) {
        return "ar".equals(locale) ? "تمت الموافقة على إعلانك" : "Your Listing Was Approved";
    }

    private static String ownerRejectedTitle(String locale) {
        return "ar".equals(locale) ? "تم رفض إعلانك" : "Your Listing Was Rejected";
    }

    private static String ownerApprovedMsg(String title, String locale) {
        return "ar".equals(locale)
                ? "إعلانك \"" + title + "\" تمت الموافقة عليه وهو متاح الآن في السوق."
                : "Your listing \"" + title + "\" has been approved and is now live on the marketplace.";
    }

    private static String ownerRejectedMsg(String title, String reason, String locale) {
        String note = (reason != null && !reason.isBlank()) ? " — " + reason : "";
        return "ar".equals(locale)
                ? "لم يتم قبول إعلانك \"" + title + "\"" + note + "."
                : "Your listing \"" + title + "\" was not accepted" + note + ".";
    }

    // ── Peer staff messages ───────────────────────────────────────────────────

    private static String peerApprovedTitle(String reviewerRole, String locale) {
        String role = "ADMIN".equalsIgnoreCase(reviewerRole) ? "Admin" : "Team Lead";
        return role + " approved a listing";
    }

    private static String peerRejectedTitle(String reviewerRole, String locale) {
        String role = "ADMIN".equalsIgnoreCase(reviewerRole) ? "Admin" : "Team Lead";
        return role + " rejected a listing";
    }

    private static String peerApprovedMsg(String reviewerEmail, String title, String locale) {
        return reviewerEmail + " approved \"" + title + "\" and published it to the marketplace.";
    }

    private static String peerRejectedMsg(String reviewerEmail, String title, String reason, String locale) {
        String note = (reason != null && !reason.isBlank()) ? ": " + reason : ".";
        return reviewerEmail + " rejected \"" + title + "\"" + note;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static String str(Object v)  { return v == null ? "" : String.valueOf(v); }

    private static Long asLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return null; }
    }
}
