package com.rigoomarine.notification.mail;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

import java.util.Properties;

/**
 * Unified mail sender for notification-module. Reads SMTP config from
 * contact_info table (60s cache) so settings changed via the admin UI
 * take effect without a restart. Falls back to env vars if no DB entry.
 */
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class DynamicMailSender implements MailSender {

    private final MailConfigService configService;
    private final MeterRegistry meterRegistry;

    @Override
    public void send(String to, String subject, String body) {
        MailConfig cfg = configService.getConfig();

        if (!cfg.isEnabled() || !cfg.isValid()) {
            log.info("\n==== [MAIL-DISABLED] ====\n  To: {}\n  Subject: {}\n"
                + "  (Enable SMTP via Admin → Settings → Email)\n"
                + "========================\n", to, subject);
            return;
        }

        try {
            JavaMailSenderImpl sender = buildSender(cfg);
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(cfg.getFrom());
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            sender.send(msg);
            meterRegistry.counter("notification.mail.sent.total").increment();
            log.info("mail.sent recipient={}", mask(to));
        } catch (Exception e) {
            meterRegistry.counter("notification.mail.failed.total").increment();
            log.error("mail.failed recipient={} error={}", mask(to), e.getMessage());
            throw e;
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
