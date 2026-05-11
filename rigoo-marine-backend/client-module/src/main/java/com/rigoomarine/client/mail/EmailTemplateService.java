package com.rigoomarine.client.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailTemplateService {

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

        for (Map.Entry<String, String> e : vars.entrySet()) {
            String placeholder = "{{" + e.getKey() + "}}";
            String value = e.getValue() == null ? "" : e.getValue();
            subject = subject.replace(placeholder, value);
            body = body.replace(placeholder, value);
        }

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
}
