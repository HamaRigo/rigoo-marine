package com.rigoomarine.notification.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Looks up an email template by name, picks AR or EN columns based on locale,
 * substitutes {{placeholder}} tokens, and sends via MailSender.
 *
 * Mirrors client-module's EmailTemplateService so future bilingual templates can land here too.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private final EmailTemplateRepository repository;
    private final MailSender mailSender;

    public void send(String name, String to, String locale, Map<String, String> vars) {
        EmailTemplate tpl = repository.findFirstByName(name).orElse(null);
        if (tpl == null) {
            log.warn("Email template not found: {} — skipping send to {}", name, to);
            return;
        }

        boolean ar = "ar".equalsIgnoreCase(locale)
                && tpl.getSubjectAr() != null
                && tpl.getBodyAr() != null;

        String subject = ar ? tpl.getSubjectAr() : tpl.getSubject();
        String body = ar ? tpl.getBodyAr() : tpl.getBody();

        for (Map.Entry<String, String> e : vars.entrySet()) {
            String placeholder = "{{" + e.getKey() + "}}";
            String value = e.getValue() == null ? "" : e.getValue();
            subject = subject.replace(placeholder, value);
            body = body.replace(placeholder, value);
        }

        mailSender.send(to, subject, body);
    }
}
