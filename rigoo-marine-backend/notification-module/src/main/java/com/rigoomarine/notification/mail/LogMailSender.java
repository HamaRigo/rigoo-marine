package com.rigoomarine.notification.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Dev fallback — logs the full email to stdout. Active when app.mail.enabled is unset or false.
 * Mirrors the client-module pattern so flipping MAIL_ENABLED=true switches to SMTP automatically.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "false", matchIfMissing = true)
public class LogMailSender implements MailSender {

    @Override
    public void send(String to, String subject, String body) {
        log.info("\n==== [DEV MAIL] ====\n  To: {}\n  Subject: {}\n  Body:\n{}\n====================\n",
                to, subject, body);
    }
}
