package com.rigoomarine.client.mail;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pins the state transitions performed by {@link EmailOutboxSettler}. The
 * proxy semantics ({@code REQUIRES_NEW} actually applying because of cross-bean
 * call) are a runtime property of the Spring container and are best verified
 * by integration tests; here we lock down the in-memory effects so a future
 * refactor can't silently change which fields get stamped on each transition.
 */
class EmailOutboxSettlerTest {

    private FakeOutboxRepo repo;
    private EmailOutboxSettler settler;

    @BeforeEach
    void setUp() {
        repo = new FakeOutboxRepo();
        settler = new EmailOutboxSettler(repo);
    }

    @Test
    void settleSent_clearsTransientFields_andStampsLastAttempt() {
        EmailOutboxEntry row = builder()
            .nextRetryAt(LocalDateTime.now().plusMinutes(5))
            .claimedAt(LocalDateTime.now())
            .build();
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);

        settler.settleSent(row);

        EmailOutboxEntry saved = repo.saves.get(0);
        assertEquals("SENT", saved.getStatus());
        assertNull(saved.getClaimedAt(), "claimed_at cleared so reclaim sweep ignores it");
        assertNull(saved.getNextRetryAt(), "next_retry_at cleared so redriver ignores it");
        assertTrue(saved.getLastAttemptAt().isAfter(before),
            "last_attempt_at stamped roughly now, got " + saved.getLastAttemptAt());
    }

    @Test
    void settleFailed_advancesNextRetry_byCorrectBackoff() {
        EmailOutboxEntry row = builder().redriveAttempts(2).build();
        MailException cause = new MailSendException("503 provider down");

        settler.settleFailed(row, cause, 3);  // 3rd redrive attempt just failed

        EmailOutboxEntry saved = repo.saves.get(0);
        assertEquals("FAILED", saved.getStatus());
        assertNull(saved.getClaimedAt());
        assertEquals(3, saved.getRedriveAttempts());
        // Backoff for attempt #3 is 20 min (curve: 5/10/20/40/60).
        long delta = Duration.between(LocalDateTime.now(), saved.getNextRetryAt()).toMinutes();
        assertTrue(delta >= 19 && delta <= 20,
            "next_retry_at should be ~20 min away, got " + delta + " min");
        assertTrue(saved.getErrorMessage().contains("MailSendException"));
        assertTrue(saved.getErrorMessage().contains("503 provider down"));
    }

    @Test
    void settleDead_bumpsAttempts_clearsRetryFields_andRecordsError() {
        EmailOutboxEntry row = builder().redriveAttempts(4).build();
        MailException cause = new MailSendException("bad recipient");

        settler.settleDead(row, cause);

        EmailOutboxEntry saved = repo.saves.get(0);
        assertEquals("DEAD", saved.getStatus());
        assertNull(saved.getClaimedAt());
        assertNull(saved.getNextRetryAt(), "DEAD rows must not be re-scheduled");
        assertEquals(5, saved.getRedriveAttempts(), "redrive_attempts incremented to mark the giveup attempt");
        assertTrue(saved.getErrorMessage().contains("bad recipient"));
    }

    @Test
    void backoffMinutes_matchesDocumentedCurve() {
        assertEquals(5,  EmailOutboxSettler.backoffMinutes(1));
        assertEquals(10, EmailOutboxSettler.backoffMinutes(2));
        assertEquals(20, EmailOutboxSettler.backoffMinutes(3));
        assertEquals(40, EmailOutboxSettler.backoffMinutes(4));
        assertEquals(60, EmailOutboxSettler.backoffMinutes(5));
    }

    @Test
    void backoffMinutes_capsAtSixty_andHandlesOutOfRange() {
        assertEquals(60, EmailOutboxSettler.backoffMinutes(6));
        assertEquals(60, EmailOutboxSettler.backoffMinutes(99));
        assertEquals(5,  EmailOutboxSettler.backoffMinutes(0));
        assertEquals(5,  EmailOutboxSettler.backoffMinutes(-3));
    }

    @Test
    void redriverDelegatesBackoff_toSettler_singleSourceOfTruth() {
        // Locks the contract that EmailOutboxRedriver.backoffMinutes simply
        // forwards to EmailOutboxSettler.backoffMinutes — any divergence in a
        // future refactor would break independent dashboards.
        for (int n = 1; n <= 6; n++) {
            assertEquals(EmailOutboxSettler.backoffMinutes(n), EmailOutboxRedriver.backoffMinutes(n),
                "backoff curve must match between settler and redriver for attempt " + n);
        }
    }

    // ---------- helpers ----------

    private EmailOutboxEntry.EmailOutboxEntryBuilder builder() {
        return EmailOutboxEntry.builder()
            .id(1L)
            .recipient("user@example.com")
            .subject("subj")
            .body("body")
            .redriveAttempts(0);
    }

    private static final class FakeOutboxRepo implements EmailOutboxRepository {
        final java.util.List<EmailOutboxEntry> saves = new java.util.ArrayList<>();
        @Override public <S extends EmailOutboxEntry> S save(S entity) { saves.add(entity); return entity; }
        // The settler only calls save(); shim everything else to satisfy the interface.
        @Override public long countByStatus(String s) { return 0; }
        @Override public int claim(LocalDateTime now, int limit) { return 0; }
        @Override public java.util.List<EmailOutboxEntry> findAllByStatusAndClaimedAtGreaterThanEqual(String status, LocalDateTime since) { return java.util.List.of(); }
        @Override public int reclaimStale(LocalDateTime threshold) { return 0; }
        @Override public int deleteSentOlderThan(LocalDateTime threshold, int batchSize) { return 0; }
        @Override public int deleteDeadOlderThan(LocalDateTime threshold, int batchSize) { return 0; }
        @Override public <S extends EmailOutboxEntry> java.util.List<S> saveAll(Iterable<S> entities) { java.util.List<S> r = new java.util.ArrayList<>(); for (S e : entities) r.add(save(e)); return r; }
        @Override public java.util.Optional<EmailOutboxEntry> findById(Long id) { return java.util.Optional.empty(); }
        @Override public boolean existsById(Long id) { return false; }
        @Override public java.util.List<EmailOutboxEntry> findAll() { return java.util.List.of(); }
        @Override public java.util.List<EmailOutboxEntry> findAllById(Iterable<Long> ids) { return java.util.List.of(); }
        @Override public long count() { return 0; }
        @Override public void deleteById(Long id) {}
        @Override public void delete(EmailOutboxEntry entity) {}
        @Override public void deleteAllById(Iterable<? extends Long> ids) {}
        @Override public void deleteAll(Iterable<? extends EmailOutboxEntry> entities) {}
        @Override public void deleteAll() {}
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
        @Override public java.util.List<EmailOutboxEntry> findAll(org.springframework.data.domain.Sort sort) { return java.util.List.of(); }
        @Override public org.springframework.data.domain.Page<EmailOutboxEntry> findAll(org.springframework.data.domain.Pageable pageable) { return org.springframework.data.domain.Page.empty(); }
        @Override public <S extends EmailOutboxEntry> java.util.Optional<S> findOne(org.springframework.data.domain.Example<S> example) { return java.util.Optional.empty(); }
        @Override public <S extends EmailOutboxEntry> org.springframework.data.domain.Page<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Pageable pageable) { return org.springframework.data.domain.Page.empty(); }
        @Override public <S extends EmailOutboxEntry> long count(org.springframework.data.domain.Example<S> example) { return 0; }
        @Override public <S extends EmailOutboxEntry> boolean exists(org.springframework.data.domain.Example<S> example) { return false; }
        @Override public <S extends EmailOutboxEntry, R> R findBy(org.springframework.data.domain.Example<S> example, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public void flush() {}
        // Suppress unused import warnings for HashMap/Map left in via the original test pattern.
        Map<String, Object> _unused = new HashMap<>();
    }
}
