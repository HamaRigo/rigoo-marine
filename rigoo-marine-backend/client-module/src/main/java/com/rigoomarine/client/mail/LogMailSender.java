package com.rigoomarine.client.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Dev fallback: logs the full email to stdout so links (verification, password reset)
 * can be recovered from logs without an SMTP provider configured.
 *
 * Active when app.mail.enabled is unset or false.
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
