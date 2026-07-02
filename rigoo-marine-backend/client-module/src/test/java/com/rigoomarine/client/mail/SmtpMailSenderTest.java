package com.rigoomarine.client.mail;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Covers DynamicMailSender behaviour: skip when disabled/invalid,
 * outbox write on @Recover, and swallow of outbox failure.
 * Actual SMTP dispatch is integration-tested via real JavaMailSenderImpl
 * (not mocked here — it is built inside the class from live config).
 */
@ExtendWith(MockitoExtension.class)
class SmtpMailSenderTest {

    @Mock MailConfigService configService;
    @Mock EmailOutboxRepository outboxRepository;
    @InjectMocks DynamicMailSender sender;

    @Test
    void send_skips_whenDisabled() {
        when(configService.getConfig()).thenReturn(
            MailConfig.builder().enabled(false).host("smtp.example.com")
                .port(587).username("u").password("p").from("f@f.com").build());

        assertDoesNotThrow(() -> sender.send("to@example.com", "Sub", "Body"));
        verifyNoInteractions(outboxRepository);
    }

    @Test
    void send_skips_whenHostBlank() {
        when(configService.getConfig()).thenReturn(
            MailConfig.builder().enabled(true).host("")
                .port(587).username("u").password("p").from("f@f.com").build());

        assertDoesNotThrow(() -> sender.send("to@example.com", "Sub", "Body"));
        verifyNoInteractions(outboxRepository);
    }

    @Test
    void recover_writesOutboxRow_andSwallowsException() {
        MailSendException cause = new MailSendException("connection refused");

        sender.recover(cause, "user@example.com", "Subj", "Body");

        verify(outboxRepository).save(argThat(row ->
            "user@example.com".equals(row.getRecipient())
            && "Subj".equals(row.getSubject())
            && "Body".equals(row.getBody())
            && "FAILED".equals(row.getStatus())
            && row.getRetryCount() == 3
            && row.getErrorMessage().contains("MailSendException")
        ));
    }

    @Test
    void recover_doesNotThrow_whenOutboxWriteFails() {
        when(outboxRepository.save(any())).thenThrow(new RuntimeException("simulated db outage"));

        assertDoesNotThrow(() -> sender.recover(
            new MailSendException("provider down"),
            "user@example.com", "Subj", "Body"));
    }
}
