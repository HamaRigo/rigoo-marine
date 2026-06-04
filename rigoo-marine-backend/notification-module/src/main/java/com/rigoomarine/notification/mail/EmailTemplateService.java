package com.rigoomarine.notification.mail;

import com.rigoomarine.notification.recipient.RecipientLookup;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Looks up an email template by name, picks AR or EN columns based on locale,
 * substitutes {{placeholder}} tokens, and sends via MailSender.
 *
 * Mirrors client-module's EmailTemplateService so future bilingual templates can land here too.
 *
 * <p>Two overloads of {@link #send}:
 * <ul>
 *   <li>The Recipient-aware variant ({@code send(name, Recipient, vars)}) is
 *       the preferred path. It honours {@code notifications_paused} (silently
 *       skips), appends a per-language unsubscribe footer with the
 *       recipient's token, and resolves locale from the recipient row.</li>
 *   <li>The legacy {@code send(name, to, locale, vars)} signature is kept
 *       for opaque-recipient cases (no clientId, no token). It skips the
 *       paused check + the unsubscribe footer — used only by paths that
 *       can't yet resolve a Recipient.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    private final EmailTemplateRepository repository;
    private final MailSender mailSender;

    /** Base URL for the public unsubscribe page. Set per environment. */
    @Value("${app.notifications.unsubscribe-url:http://localhost:8080/unsubscribe}")
    private String unsubscribeBaseUrl;

    /**
     * Preferred entry point. Skips send entirely when the recipient has paused
     * notifications; appends a localised unsubscribe footer otherwise.
     */
    public void send(String name, RecipientLookup.Recipient recipient, Map<String, String> vars) {
        if (recipient == null) {
            log.warn("send({}) called with null recipient — skipping", name);
            return;
        }
        if (recipient.notificationsPaused()) {
            log.debug("Skipping {} send to {} — recipient opted out", name, recipient.email());
            return;
        }
        Composed c = compose(name, recipient.safeLocale(), vars);
        if (c == null) return; // template missing — already logged

        String unsubUrl = recipient.unsubscribeToken() == null
            ? unsubscribeBaseUrl
            : unsubscribeBaseUrl + "?t=" + recipient.unsubscribeToken();
        String footer = unsubscribeFooter(recipient.safeLocale(), unsubUrl);
        mailSender.send(recipient.email(), c.subject(), c.body() + "\n\n" + footer);
    }

    /**
     * Legacy entry point. Skips both the paused check + the unsubscribe footer.
     * Use only when a Recipient genuinely isn't resolvable (anonymous flows,
     * tests, OPS scripts). Most callers should use the Recipient variant.
     */
    public void send(String name, String to, String locale, Map<String, String> vars) {
        Composed c = compose(name, locale, vars);
        if (c == null) return;
        mailSender.send(to, c.subject(), c.body());
    }

    // ─── Internals ──────────────────────────────────────────────────────────

    /** Subject + body pair returned from {@link #compose}. */
    private record Composed(String subject, String body) {}

    /**
     * Pure function: load template → pick locale variant → substitute placeholders.
     * Returns null when the named template doesn't exist (already logged).
     */
    private Composed compose(String name, String locale, Map<String, String> vars) {
        EmailTemplate tpl = repository.findFirstByName(name).orElse(null);
        if (tpl == null) {
            log.warn("Email template not found: {} — skipping send", name);
            return null;
        }
        boolean ar = "ar".equalsIgnoreCase(locale)
                && tpl.getSubjectAr() != null
                && tpl.getBodyAr() != null;
        String subject = ar ? tpl.getSubjectAr() : tpl.getSubject();
        String body = ar ? tpl.getBodyAr() : tpl.getBody();

        return new Composed(render(subject, vars), render(body, vars));
    }

    /**
     * Per-locale unsubscribe footer. Intentionally short — most operators
     * expect a single sentence + a clickable URL.
     */
    private static String render(String template, Map<String, String> vars) {
        if (template == null || vars.isEmpty()) return template;
        Matcher m = PLACEHOLDER.matcher(template);
        StringBuilder sb = new StringBuilder(template.length());
        while (m.find()) {
            String val = vars.getOrDefault(m.group(1), "");
            m.appendReplacement(sb, Matcher.quoteReplacement(val));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private static String unsubscribeFooter(String locale, String url) {
        if ("ar".equalsIgnoreCase(locale)) {
            return "—\nلإلغاء الاشتراك من هذا النوع من الرسائل اضغط هنا: " + url;
        }
        return "—\nTo unsubscribe from these emails, visit: " + url;
    }
}
