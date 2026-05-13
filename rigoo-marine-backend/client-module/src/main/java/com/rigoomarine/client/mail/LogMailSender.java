package com.rigoomarine.client.mail;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Dev fallback: logs the full email to stdout so links (verification, password reset)
 * can be recovered from logs without an SMTP provider configured.
 *
 * <p>Active when {@code app.mail.enabled} is unset or false. <strong>Refuses to start
 * in production profiles</strong> via a {@link PostConstruct} guard: emitting
 * verification / password-reset links to logs in production would leak bearer
 * tokens to anyone with log access. Set {@code app.mail.enabled=true} (and
 * configure {@code SmtpMailSender}) to ship to prod; the override
 * {@code app.log-sender.allow-in-prod=true} is the emergency drill escape hatch.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "false", matchIfMissing = true)
public class LogMailSender implements MailSender {

    private final Environment environment;
    private final boolean allowInProd;
    private final Set<String> prodProfiles;

    public LogMailSender(
            Environment environment,
            @Value("${app.log-sender.allow-in-prod:false}") boolean allowInProd,
            @Value("${app.log-sender.prod-profiles:prod,production,live}") String prodProfilesCsv
    ) {
        this.environment = environment;
        this.allowInProd = allowInProd;
        this.prodProfiles = Arrays.stream(prodProfilesCsv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(String::toLowerCase)
            .collect(Collectors.toCollection(HashSet::new));
    }

    @PostConstruct
    void refuseToRunInProd() {
        List<String> active = Arrays.stream(environment.getActiveProfiles())
            .map(String::toLowerCase)
            .collect(Collectors.toList());
        List<String> matched = active.stream()
            .filter(prodProfiles::contains)
            .collect(Collectors.toList());

        if (matched.isEmpty()) return;

        if (allowInProd) {
            log.warn("LogMailSender allowed in production profile {} via app.log-sender.allow-in-prod=true. " +
                "Emails (including verification + password-reset links) will be written to logs.", matched);
            return;
        }

        throw new IllegalStateException(
            "LogMailSender refused to start in production profile " + matched + ".\n" +
            "Verification + password-reset emails would be written to logs, leaking the embedded tokens.\n" +
            "Set app.mail.enabled=true and configure SmtpMailSender, or set\n" +
            "app.log-sender.allow-in-prod=true if this is an intentional drill.");
    }

    @Override
    public void send(String to, String subject, String body) {
        log.info("\n==== [DEV MAIL] ====\n  To: {}\n  Subject: {}\n  Body:\n{}\n====================\n",
                to, subject, body);
    }
}
