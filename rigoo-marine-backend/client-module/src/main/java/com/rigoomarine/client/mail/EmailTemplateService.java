package com.rigoomarine.client.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private final EmailTemplateRepository repository;
    private final MailSender mailSender;

    /**
     * Render a template by name and send it.
     * @param locale "ar" picks the Arabic columns; anything else falls back to English.
     */
    public void send(String name, String to, String locale, Map<String, String> vars) {
        EmailTemplate tpl = repository.findFirstByName(name)
                .orElseThrow(() -> new IllegalStateException("Email template not found: " + name));

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
