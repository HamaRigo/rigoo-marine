package com.rigoomarine.client.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailTemplateService {

    // Single compiled pattern reused across all template renders.
    // Matches {{word}} placeholders; capturing group 1 is the key.
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    private final EmailTemplateRepository repository;
    private final MailSender mailSender;
    private final MailMetrics metrics;

    /**
     * Render a template by name and send it. Runs on the {@code mailTaskExecutor}
     * pool so the calling HTTP thread returns immediately; SMTP retries +
     * outbox writes happen out-of-band.
     *
     * @param locale "ar" picks the Arabic columns when present; otherwise English.
     *               A locale request that falls back to English is logged at WARN
     *               so ops can spot missing translations.
     */
    @Async("mailTaskExecutor")
    public void send(String name, String to, String locale, Map<String, String> vars) {
        metrics.recordAttempt(name);
        EmailTemplate tpl = repository.findFirstByName(name)
                .orElseThrow(() -> new IllegalStateException("Email template not found: " + name));

        boolean arRequested = "ar".equalsIgnoreCase(locale);
        boolean arAvailable = tpl.getSubjectAr() != null && tpl.getBodyAr() != null;
        boolean ar = arRequested && arAvailable;
        if (arRequested && !arAvailable) {
            log.warn("mail.template.locale_fallback template={} reason=missing_ar_columns", name);
        }

        String subject = ar ? tpl.getSubjectAr() : tpl.getSubject();
        String body = ar ? tpl.getBodyAr() : tpl.getBody();

        subject = render(subject, vars);
        body    = render(body, vars);

        try {
            mailSender.send(to, subject, body);
            metrics.recordSuccess(name);
        } catch (RuntimeException ex) {
            // SmtpMailSender's @Recover already wrote the outbox row and swallowed
            // the original MailException — so reaching this catch means the
            // outbox write itself failed, OR LogMailSender threw (it shouldn't).
            metrics.recordFailure(name);
            throw ex;
        }
    }

    /**
     * Single-pass O(template_length) substitution.
     * Serial String.replace calls are O(vars × length); a regex Matcher scans once.
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
}
