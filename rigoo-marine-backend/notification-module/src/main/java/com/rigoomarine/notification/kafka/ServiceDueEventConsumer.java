package com.rigoomarine.notification.kafka;

import com.rigoomarine.notification.entity.Notification;
import com.rigoomarine.notification.mail.EmailTemplateService;
import com.rigoomarine.notification.recipient.RecipientLookup;
import com.rigoomarine.notification.repository.NotificationRepository;
import com.rigoomarine.notification.whatsapp.WhatsAppSender;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Consumes {@code maintenance.service-due.v1} events from maintenance-module
 * and fans them out to (a) the in-app notifications feed, (b) the bilingual
 * SERVICE_DUE email template.
 *
 * <p>Locale resolution happens once per event: look up the recipient first,
 * then build the in-app title/body AND the email payload in the recipient's
 * preferred language. Falls back to English when the recipient row is
 * missing (anonymous-ish edge cases — shouldn't happen for SERVICE_DUE
 * since these events are emitted from owned-vessel schedules, but defensive
 * fallback keeps the row honest).
 *
 * <p>Deserialised as {@code Map<String,Object>} so this module doesn't need
 * maintenance-module classes on the classpath (matches the shop-orders pattern).
 */
@Slf4j
@Component
public class ServiceDueEventConsumer {

    private static final String TYPE = "SERVICE_DUE";

    private final EmailTemplateService emailTemplateService;
    private final NotificationRepository notificationRepository;
    private final RecipientLookup recipientLookup;
    private final EventDedupe eventDedupe;
    private final NotificationMetrics metrics;
    /**
     * Optional — only present when {@code app.whatsapp.enabled=true}. The
     * @ConditionalOnProperty on WhatsAppSender keeps the bean out of the
     * context entirely otherwise, so we tolerate its absence here.
     */
    private final WhatsAppSender whatsAppSender;

    public ServiceDueEventConsumer(
            EmailTemplateService emailTemplateService,
            NotificationRepository notificationRepository,
            RecipientLookup recipientLookup,
            EventDedupe eventDedupe,
            NotificationMetrics metrics,
            @Autowired(required = false) WhatsAppSender whatsAppSender
    ) {
        this.emailTemplateService = emailTemplateService;
        this.notificationRepository = notificationRepository;
        this.recipientLookup = recipientLookup;
        this.eventDedupe = eventDedupe;
        this.metrics = metrics;
        this.whatsAppSender = whatsAppSender;
    }

    @KafkaListener(topics = "maintenance.service-due.v1", groupId = "notification-maintenance")
    @Transactional
    public void onServiceDue(Map<String, Object> event) {
        if (event == null) return;
        metrics.received(TYPE).increment();
        Long clientId = asLong(event.get("clientId"));
        if (clientId == null) {
            log.warn("ServiceDueEvent missing clientId — skipping");
            metrics.failed(TYPE).increment();
            return;
        }
        // Redis-backed dedupe — guards against Kafka redelivery duplicating
        // the Notification row AND the email send. Producer emits a UUID
        // eventId per fire (see ServiceDuePublisher).
        String eventId = stringOf(event.get("eventId"));
        if (!eventDedupe.firstTime(eventId)) {
            log.info("ServiceDueEvent eventId={} already processed — skipping redelivery", eventId);
            metrics.deduped(TYPE).increment();
            return;
        }

        String serviceType = stringOf(event.get("serviceType"));
        String urgency = stringOf(event.get("urgency"));
        String vesselId = stringOf(event.get("vesselId"));
        String nextDueDate = stringOf(event.get("nextDueDate"));
        String daysUntilDue = stringOf(event.get("daysUntilDue"));

        // Resolve recipient + locale up front so the in-app row + the email
        // both speak the same language.
        Optional<RecipientLookup.Recipient> recOpt = recipientLookup.findByClientId(clientId);
        String locale = recOpt.map(RecipientLookup.Recipient::safeLocale).orElse("en");

        // 1) In-app row — always persisted so the bell badge surfaces.
        // actionUrl deep-links into the pre-filled /service-request page;
        // bell + feed render it as a "Book now" button. This closes the
        // reminder → work-order loop in one click.
        String title = title(serviceType, urgency, locale);
        String body  = body(serviceType, urgency, nextDueDate, daysUntilDue, locale);
        String actionUrl = buildBookUrl(vesselId, serviceType);
        Notification notification = Notification.builder()
            .clientId(clientId)
            .type("SERVICE_DUE")
            .title(title)
            .message(body)
            .actionUrl(actionUrl)
            .status(Notification.NotificationStatus.PENDING)
            .channel("IN_APP+EMAIL")
            .read(false)
            .build();
        notificationRepository.save(notification);

        // 2) Email — best-effort. EmailTemplateService picks the AR variant
        //    of the SERVICE_DUE template when locale="ar".
        recOpt.ifPresentOrElse(rec -> {
            Map<String, String> vars = new HashMap<>();
            vars.put("serviceType", humaniseService(serviceType, locale));
            vars.put("urgency", urgencyLabel(urgency, locale));
            vars.put("vesselId", vesselId);
            vars.put("nextDueDate", nextDueDate);
            vars.put("daysUntilDue", daysUntilDue);
            vars.put("customerName", rec.name() == null ? "" : rec.name());
            // Recipient-aware overload: honours notifications_paused and
            // appends the per-language unsubscribe footer automatically.
            emailTemplateService.send("SERVICE_DUE", rec, vars);
            notification.setStatus(Notification.NotificationStatus.SENT);
            notification.setSentAt(LocalDateTime.now());
            notificationRepository.save(notification);

            // 3) WhatsApp — opt-in only, best-effort. Failures are logged
            //    (with the sender's own metric counters) and never bubble
            //    out; the email + in-app row already landed so the user
            //    isn't deprived of the reminder.
            if (whatsAppSender != null && rec.whatsappOptIn()
                    && rec.phone() != null && !rec.phone().isBlank()) {
                try {
                    whatsAppSender.send(rec.phone(), waBody(serviceType, urgency, nextDueDate, locale));
                } catch (Exception ex) {
                    log.warn("WhatsApp send failed for clientId={}: {}", clientId, ex.getMessage());
                }
            }
        }, () -> log.warn("No recipient found for clientId={} — in-app only", clientId));
        metrics.processed(TYPE).increment();
    }

    /**
     * Compact WhatsApp body — these channels punish long messages, so
     * trim to the essentials: service + urgency + date. Localised
     * just like the in-app row / email subject.
     */
    private static String waBody(String serviceType, String urgency, String nextDueDate, String locale) {
        boolean ar = "ar".equalsIgnoreCase(locale);
        String svc = humaniseService(serviceType, locale);
        if ("OVERDUE".equals(urgency)) {
            return ar
                ? "تذكير: " + svc + " متأخرة (كانت مستحقة في " + nextDueDate + "). احجز الآن من Rigoo Marine."
                : "Reminder: " + svc + " is OVERDUE (was due " + nextDueDate + "). Book now via Rigoo Marine.";
        }
        return ar
            ? "تذكير: " + svc + " مستحقة في " + nextDueDate + ". احجز الآن من Rigoo Marine."
            : "Reminder: " + svc + " is due " + nextDueDate + ". Book now via Rigoo Marine.";
    }

    // ─── Locale-aware text builders ─────────────────────────────────────────

    private static String title(String serviceType, String urgency, String locale) {
        boolean ar = "ar".equalsIgnoreCase(locale);
        String pretty = humaniseService(serviceType, locale);
        if ("OVERDUE".equals(urgency)) {
            return ar ? pretty + " متأخرة" : pretty + " is overdue";
        }
        return ar ? pretty + " قريباً" : pretty + " due soon";
    }

    private static String body(String serviceType, String urgency, String nextDueDate, String daysUntilDue, String locale) {
        boolean ar = "ar".equalsIgnoreCase(locale);
        String pretty = humaniseService(serviceType, locale);
        if ("OVERDUE".equals(urgency)) {
            return ar
                ? "كانت " + pretty + " مستحقة في " + nextDueDate + ". يرجى جدولتها في أقرب وقت ممكن."
                : pretty + " was due on " + nextDueDate
                    + ". Schedule it as soon as possible to keep your warranty intact.";
        }
        String dueLine = ar
            ? pretty + " مستحقة في " + nextDueDate
            : pretty + " is due on " + nextDueDate;
        if (daysUntilDue != null && !daysUntilDue.isEmpty()) {
            dueLine += ar ? " (خلال " + daysUntilDue + " أيام)" : " (in " + daysUntilDue + " days)";
        }
        return dueLine + ".";
    }

    /**
     * Frontend-relative URL the bell button links to. Pre-fills the
     * service-request form so the user only has to add location + a note.
     * Vessel id + ServiceType travel as query params; the frontend maps
     * ServiceType → IssueCategory.
     */
    private static String buildBookUrl(String vesselId, String serviceType) {
        if (vesselId == null || vesselId.isEmpty()) return null;
        String url = "/service-request?vessel=" + vesselId;
        if (serviceType != null && !serviceType.isEmpty()) {
            url += "&type=" + serviceType;
        }
        return url;
    }

    private static String urgencyLabel(String urgency, String locale) {
        if (urgency == null) return "";
        if ("ar".equalsIgnoreCase(locale)) {
            return "OVERDUE".equals(urgency) ? "متأخرة" : "قريباً";
        }
        return "OVERDUE".equals(urgency) ? "OVERDUE" : "DUE SOON";
    }

    /**
     * Locale-aware service-type label. For Arabic, table-driven for the 11
     * enum values plus a sensible "OTHER" fallback. For English, a generic
     * snake-case → Title Case humanise so newly added ServiceTypes work
     * without a code edit.
     */
    private static String humaniseService(String enumValue, String locale) {
        if (enumValue == null) return "ar".equalsIgnoreCase(locale) ? "خدمة" : "Service";
        if ("ar".equalsIgnoreCase(locale)) {
            return AR_SERVICE_TYPES.getOrDefault(enumValue, "خدمة");
        }
        // EN: SERVICE_FOO_BAR → "Service foo bar"
        String lower = enumValue.replace('_', ' ').toLowerCase();
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    /**
     * Arabic labels for every ServiceType enum value. Kept in sync with the
     * maintenance-module enum + the frontend's i18n maintenance namespace.
     */
    private static final Map<String, String> AR_SERVICE_TYPES = Map.ofEntries(
        Map.entry("OIL_CHANGE",        "تغيير الزيت"),
        Map.entry("ENGINE_SERVICE",    "صيانة المحرك"),
        Map.entry("HULL_CLEANING",     "تنظيف الهيكل"),
        Map.entry("ANTIFOULING",       "طلاء مضاد للحشف"),
        Map.entry("PROPELLER_SERVICE", "خدمة المروحة"),
        Map.entry("IMPELLER",          "الدافعة"),
        Map.entry("FUEL_FILTER",       "فلتر الوقود"),
        Map.entry("ZINC_ANODES",       "أنودات الزنك"),
        Map.entry("BATTERY",           "البطارية"),
        Map.entry("INSPECTION",        "فحص"),
        Map.entry("OTHER",             "أخرى")
    );

    private static String stringOf(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private static Long asLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return null; }
    }
}
