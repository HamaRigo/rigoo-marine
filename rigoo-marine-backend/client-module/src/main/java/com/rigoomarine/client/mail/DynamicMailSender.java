package com.rigoomarine.client.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;

import java.util.Properties;

/**
 * Unified mail sender that reads SMTP configuration from the contact_info
 * table at runtime (60-second cache). Falls back to env-var defaults.
 * Replaces the static LogMailSender / SmtpMailSender pair.
 */
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class DynamicMailSender implements MailSender {

    private final MailConfigService configService;
    private final EmailOutboxRepository outboxRepository;

    @Override
    @Retryable(retryFor = MailException.class, maxAttempts = 3,
               backoff = @Backoff(delay = 1000, multiplier = 2.0))
    public void send(String to, String subject, String body) {
        MailConfig cfg = configService.getConfig();

        if (!cfg.isEnabled() || !cfg.isValid()) {
            log.info("\n==== [MAIL-DISABLED] ====\n  To: {}\n  Subject: {}\n"
                + "  (Enable SMTP via Admin → Settings → Email)\n"
                + "========================\n", to, subject);
            return;
        }

        JavaMailSenderImpl sender = buildSender(cfg);
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(cfg.getFrom());
        msg.setTo(to);
        msg.setSubject(subject);
        msg.setText(body);
        sender.send(msg);
        log.info("mail.sent recipient={}", mask(to));
    }

    @Recover
    public void recover(MailException ex, String to, String subject, String body) {
        log.error("mail.giveup recipient={} error={}", mask(to), ex.getMessage());
        try {
            outboxRepository.save(EmailOutboxEntry.builder()
                .recipient(to).subject(subject).body(body)
                .errorMessage(ex.getClass().getSimpleName() + ": " + ex.getMessage())
                .retryCount(3).redriveAttempts(0)
                .nextRetryAt(java.time.LocalDateTime.now().plusMinutes(5))
                .status("FAILED").build());
        } catch (RuntimeException e) {
            log.error("mail.outbox.write_failed recipient={} cause={}", mask(to), e.toString());
        }
    }

    private JavaMailSenderImpl buildSender(MailConfig cfg) {
        JavaMailSenderImpl s = new JavaMailSenderImpl();
        s.setHost(cfg.getHost());
        s.setPort(cfg.getPort());
        s.setUsername(cfg.getUsername());
        s.setPassword(cfg.getPassword());
        Properties p = s.getJavaMailProperties();
        p.put("mail.transport.protocol", "smtp");
        p.put("mail.smtp.auth", "true");
        p.put("mail.smtp.starttls.enable", "true");
        p.put("mail.smtp.connectiontimeout", "5000");
        p.put("mail.smtp.timeout", "5000");
        return s;
    }

    private static String mask(String addr) {
        if (addr == null) return "<null>";
        int at = addr.indexOf('@');
        if (at <= 1) return "***" + (at >= 0 ? addr.substring(at) : "");
        return addr.charAt(0) + "***" + addr.substring(at);
    }
}
