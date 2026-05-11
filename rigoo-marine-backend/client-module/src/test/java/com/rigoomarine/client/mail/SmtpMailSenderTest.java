package com.rigoomarine.client.mail;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Focused tests for SmtpMailSender. Retry orchestration is Spring-Retry's
 * responsibility (and well-covered upstream), so this suite exercises just the
 * happy path and the @Recover contract: outbox write + exception swallowed.
 */
class SmtpMailSenderTest {

    private FakeJavaMailSender mail;
    private FakeOutboxRepo outbox;
    private SmtpMailSender sender;

    @BeforeEach
    void setUp() {
        mail = new FakeJavaMailSender();
        outbox = new FakeOutboxRepo();
        sender = new SmtpMailSender(mail, outbox);
        // @Value("${app.mail.from}") isn't applied in unit tests; the default is used
        // via the field initialiser when the bean is built by Spring. Mirror by
        // touching the field via reflection-free path: not needed for these tests,
        // since we assert the call shape, not the From: header.
    }

    @Test
    void send_invokesJavaMailSender_onHappyPath() {
        sender.send("user@example.com", "Hello", "World");

        assertEquals(1, mail.sent.size(), "single send");
        SimpleMailMessage msg = mail.sent.get(0);
        assertEquals("user@example.com", msg.getTo()[0]);
        assertEquals("Hello", msg.getSubject());
        assertEquals("World", msg.getText());
    }

    @Test
    void recover_writesOutboxRow_andSwallowsException() {
        MailSendException cause = new MailSendException("connection refused");

        sender.recover(cause, "user@example.com", "Subj", "Body");

        assertEquals(1, outbox.saves.size(), "one outbox row");
        EmailOutboxEntry row = outbox.saves.get(0);
        assertEquals("user@example.com", row.getRecipient());
        assertEquals("Subj", row.getSubject());
        assertEquals("Body", row.getBody());
        assertEquals("FAILED", row.getStatus());
        assertEquals(3, row.getRetryCount());
        assertTrue(row.getErrorMessage().contains("MailSendException"));
        assertTrue(row.getErrorMessage().contains("connection refused"));
    }

    @Test
    void recover_doesNotThrow_whenOutboxWriteFails() {
        FakeOutboxRepo dying = new FakeOutboxRepo();
        dying.failOnSave = true;
        SmtpMailSender s = new SmtpMailSender(mail, dying);

        // Outbox failure is logged at ERROR and swallowed — the @Async caller
        // shouldn't see a CompletionException for a dead Redis/Postgres.
        assertDoesNotThrow(() -> s.recover(
            new MailSendException("provider down"),
            "user@example.com", "Subj", "Body"));
    }

    // ---------- test doubles ----------

    private static class FakeJavaMailSender implements JavaMailSender {
        final java.util.List<SimpleMailMessage> sent = new java.util.ArrayList<>();

        @Override public void send(SimpleMailMessage message) { sent.add(message); }
        @Override public void send(SimpleMailMessage... messages) {
            for (SimpleMailMessage m : messages) sent.add(m);
        }
        @Override public jakarta.mail.internet.MimeMessage createMimeMessage() { throw new UnsupportedOperationException(); }
        @Override public jakarta.mail.internet.MimeMessage createMimeMessage(java.io.InputStream in) { throw new UnsupportedOperationException(); }
        @Override public void send(jakarta.mail.internet.MimeMessage m) { throw new UnsupportedOperationException(); }
        @Override public void send(jakarta.mail.internet.MimeMessage... ms) { throw new UnsupportedOperationException(); }
        @Override public void send(org.springframework.mail.javamail.MimeMessagePreparator p) { throw new UnsupportedOperationException(); }
        @Override public void send(org.springframework.mail.javamail.MimeMessagePreparator... ps) { throw new UnsupportedOperationException(); }
    }

    private static class FakeOutboxRepo implements EmailOutboxRepository {
        final java.util.List<EmailOutboxEntry> saves = new java.util.ArrayList<>();
        boolean failOnSave = false;

        @Override public long countByStatus(String s) { return saves.size(); }

        // Redrive-related queries: this fake is only used by the recover-path
        // tests; the redriver has its own coverage. No-op shims.
        @Override public int claim(java.time.LocalDateTime now, int limit) { return 0; }
        @Override public java.util.List<EmailOutboxEntry> findAllByStatusAndClaimedAtGreaterThanEqual(String status, java.time.LocalDateTime since) { return java.util.List.of(); }
        @Override public int reclaimStale(java.time.LocalDateTime threshold) { return 0; }

        @Override public <S extends EmailOutboxEntry> S save(S entity) {
            if (failOnSave) throw new RuntimeException("simulated db outage");
            saves.add(entity);
            // Mimic @PrePersist since we're bypassing Spring Data + Hibernate
            if (entity.getCreatedAt() == null) entity.setCreatedAt(java.time.LocalDateTime.now());
            return entity;
        }

        // Everything else: minimal no-op shims so the interface compiles.
        @Override public <S extends EmailOutboxEntry> java.util.List<S> saveAll(Iterable<S> entities) { java.util.List<S> r = new java.util.ArrayList<>(); for (S e : entities) r.add(save(e)); return r; }
        @Override public java.util.Optional<EmailOutboxEntry> findById(Long id) { return java.util.Optional.empty(); }
        @Override public boolean existsById(Long id) { return false; }
        @Override public java.util.List<EmailOutboxEntry> findAll() { return saves; }
        @Override public java.util.List<EmailOutboxEntry> findAllById(Iterable<Long> ids) { return java.util.List.of(); }
        @Override public long count() { return saves.size(); }
        @Override public void deleteById(Long id) {}
        @Override public void delete(EmailOutboxEntry entity) {}
        @Override public void deleteAllById(Iterable<? extends Long> ids) {}
        @Override public void deleteAll(Iterable<? extends EmailOutboxEntry> entities) {}
        @Override public void deleteAll() { saves.clear(); }
        @Override public <S extends EmailOutboxEntry> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends EmailOutboxEntry> java.util.List<S> saveAllAndFlush(Iterable<S> entities) { return saveAll(entities); }
        @Override public void deleteAllInBatch(Iterable<EmailOutboxEntry> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<Long> ids) {}
        @Override public void deleteAllInBatch() {}
        @Override public EmailOutboxEntry getOne(Long id) { return null; }
        @Override public EmailOutboxEntry getById(Long id) { return null; }
        @Override public EmailOutboxEntry getReferenceById(Long id) { return null; }
        @Override public <S extends EmailOutboxEntry> java.util.List<S> findAll(org.springframework.data.domain.Example<S> example) { return java.util.List.of(); }
        @Override public <S extends EmailOutboxEntry> java.util.List<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Sort sort) { return java.util.List.of(); }
        @Override public java.util.List<EmailOutboxEntry> findAll(org.springframework.data.domain.Sort sort) { return saves; }
        @Override public org.springframework.data.domain.Page<EmailOutboxEntry> findAll(org.springframework.data.domain.Pageable pageable) { return org.springframework.data.domain.Page.empty(); }
        @Override public <S extends EmailOutboxEntry> java.util.Optional<S> findOne(org.springframework.data.domain.Example<S> example) { return java.util.Optional.empty(); }
        @Override public <S extends EmailOutboxEntry> org.springframework.data.domain.Page<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Pageable pageable) { return org.springframework.data.domain.Page.empty(); }
        @Override public <S extends EmailOutboxEntry> long count(org.springframework.data.domain.Example<S> example) { return 0; }
        @Override public <S extends EmailOutboxEntry> boolean exists(org.springframework.data.domain.Example<S> example) { return false; }
        @Override public <S extends EmailOutboxEntry, R> R findBy(org.springframework.data.domain.Example<S> example, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public void flush() {}
    }
}
