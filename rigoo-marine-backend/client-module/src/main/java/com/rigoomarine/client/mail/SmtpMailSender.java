package com.rigoomarine.client.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;

/**
 * Production mail sender. Retries transient SMTP failures with exponential
 * backoff; persists to the outbox on permanent failure so ops can replay.
 * Active only when {@code app.mail.enabled=true}; the LogMailSender path is
 * unchanged and remains the default for dev.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
public class SmtpMailSender implements MailSender {

    private final JavaMailSender javaMailSender;
    private final EmailOutboxRepository outboxRepository;

    @Value("${app.mail.from:no-reply@rigoomarine.qa}")
    private String from;

    @Override
    @Retryable(
        retryFor = MailException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2.0)
    )
    public void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        javaMailSender.send(message);
        log.info("mail.sent recipient={}", mask(to));
    }

    /**
     * Invoked by Spring Retry when {@link #send} has exhausted its attempts.
     * Persists the failed dispatch to {@code email_outbox} so ops can replay.
     * Must <b>not</b> throw — that would surface to the {@code @Async} caller
     * as a CompletionException for no useful reason.
     */
    @Recover
    public void recover(MailException ex, String to, String subject, String body) {
        log.error("mail.giveup recipient={} errorClass={} message={}",
            mask(to), ex.getClass().getSimpleName(), ex.getMessage());
        try {
            // First redrive attempt happens 5 minutes from now — see EmailOutboxRedriver.BACKOFF_MINUTES.
            outboxRepository.save(EmailOutboxEntry.builder()
                .recipient(to)
                .subject(subject)
                .body(body)
                .errorMessage(ex.getClass().getSimpleName() + ": " + ex.getMessage())
                .retryCount(3)
                .redriveAttempts(0)
                .nextRetryAt(java.time.LocalDateTime.now().plusMinutes(5))
                .status("FAILED")
                .build());
        } catch (RuntimeException outboxFailure) {
            // We've now lost the email. Log loudly; nothing else to do.
            log.error("mail.outbox.write_failed recipient={} cause={}",
                mask(to), outboxFailure.toString());
        }
    }

    /** Mask middle of an email for log lines: {@code first2***@domain}. */
    private static String mask(String addr) {
        if (addr == null) return "<null>";
        int at = addr.indexOf('@');
        if (at <= 1) return "***" + (at >= 0 ? addr.substring(at) : "");
        return addr.charAt(0) + "***" + addr.substring(at);
    }
}
