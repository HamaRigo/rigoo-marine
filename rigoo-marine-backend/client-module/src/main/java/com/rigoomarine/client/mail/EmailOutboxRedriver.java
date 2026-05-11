package com.rigoomarine.client.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled redriver for rows in {@code email_outbox}. Runs once per minute on
 * every {@code client-service} instance; concurrency is handled by
 * {@code FOR UPDATE SKIP LOCKED} at claim time.
 *
 * <p>Backoff (per row, in minutes from the previous attempt):
 * <pre>5 → 10 → 20 → 40 → 60 (cap)</pre>
 * After {@value #MAX_REDRIVE_ATTEMPTS} redrive attempts the row is marked DEAD
 * and ops must inspect manually. The redriver never touches DEAD rows.
 *
 * <p>Only active when {@code app.mail.enabled=true}; LogMailSender deployments
 * have no SMTP target and no outbox writes, so there's nothing to redrive.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
public class EmailOutboxRedriver {

    static final int MAX_REDRIVE_ATTEMPTS = 5;
    private static final int CYCLE_BATCH_SIZE = 50;
    private static final long STALE_CLAIM_MINUTES = 5;
    /** Backoff curve in minutes; index = redrive_attempts BEFORE incrementing. */
    private static final long[] BACKOFF_MINUTES = { 5, 10, 20, 40, 60 };

    private final EmailOutboxRepository outboxRepository;
    private final JavaMailSender javaMailSender;
    private final MailMetrics mailMetrics;

    @Value("${app.mail.from:no-reply@rigoomarine.qa}")
    private String from;

    /**
     * 60 s fixed delay, 30 s initial delay so the scheduler doesn't fire during
     * application bootstrapping (Flyway migrations, bean wiring).
     */
    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void run() {
        try {
            reclaimStale();
            int claimed = claimBatch();
            if (claimed == 0) return;

            LocalDateTime cycleStart = LocalDateTime.now().minusSeconds(5); // covers clock-skew within the cycle
            List<EmailOutboxEntry> rows = outboxRepository
                .findAllByStatusAndClaimedAtGreaterThanEqual("RETRYING", cycleStart);

            int sent = 0, failed = 0, dead = 0;
            for (EmailOutboxEntry row : rows) {
                Outcome outcome = attempt(row);
                switch (outcome) {
                    case SENT -> sent++;
                    case FAILED -> failed++;
                    case DEAD -> dead++;
                }
            }
            log.info("outbox.redrive.cycle claimed={} sent={} failed={} dead={}",
                rows.size(), sent, failed, dead);
        } catch (RuntimeException ex) {
            log.warn("outbox.redrive.cycle_aborted cause={}", ex.toString());
        }
    }

    private void reclaimStale() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(STALE_CLAIM_MINUTES);
        int reclaimed = outboxRepository.reclaimStale(threshold);
        if (reclaimed > 0) {
            log.info("outbox.redrive.reclaimed_stale count={}", reclaimed);
        }
    }

    private int claimBatch() {
        return outboxRepository.claim(LocalDateTime.now(), CYCLE_BATCH_SIZE);
    }

    private enum Outcome { SENT, FAILED, DEAD }

    /**
     * Sends one row's email and updates its status. The SMTP call is outside
     * any DB transaction (per the architecture — long SMTP latencies must not
     * hold row locks). The status update is its own short transaction.
     */
    private Outcome attempt(EmailOutboxEntry row) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(from);
        msg.setTo(row.getRecipient());
        msg.setSubject(row.getSubject());
        msg.setText(row.getBody());

        try {
            javaMailSender.send(msg);
            settleSent(row);
            mailMetrics.recordRedriveSuccess(row.getTemplateName());
            return Outcome.SENT;
        } catch (MailException ex) {
            int newAttempts = row.getRedriveAttempts() + 1;
            if (newAttempts >= MAX_REDRIVE_ATTEMPTS) {
                settleDead(row, ex);
                mailMetrics.recordDead(row.getTemplateName());
                log.warn("outbox.redrive.dead id={} attempts={} cause={}",
                    row.getId(), newAttempts, ex.getClass().getSimpleName());
                return Outcome.DEAD;
            }
            settleFailed(row, ex, newAttempts);
            mailMetrics.recordRedriveFailure(row.getTemplateName());
            return Outcome.FAILED;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void settleSent(EmailOutboxEntry row) {
        row.setStatus("SENT");
        row.setClaimedAt(null);
        row.setNextRetryAt(null);
        row.setLastAttemptAt(LocalDateTime.now());
        outboxRepository.save(row);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void settleFailed(EmailOutboxEntry row, MailException ex, int newAttempts) {
        row.setStatus("FAILED");
        row.setClaimedAt(null);
        row.setRedriveAttempts(newAttempts);
        row.setNextRetryAt(LocalDateTime.now().plusMinutes(backoffMinutes(newAttempts)));
        row.setLastAttemptAt(LocalDateTime.now());
        row.setErrorMessage(ex.getClass().getSimpleName() + ": " + ex.getMessage());
        outboxRepository.save(row);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void settleDead(EmailOutboxEntry row, MailException ex) {
        row.setStatus("DEAD");
        row.setClaimedAt(null);
        row.setNextRetryAt(null);
        row.setRedriveAttempts(row.getRedriveAttempts() + 1);
        row.setLastAttemptAt(LocalDateTime.now());
        row.setErrorMessage(ex.getClass().getSimpleName() + ": " + ex.getMessage());
        outboxRepository.save(row);
    }

    static long backoffMinutes(int attemptNumber) {
        // attemptNumber is the NEW count after incrementing — 1 means "first redrive
        // just failed; schedule the second". Indexing: array slot (attemptNumber-1).
        int idx = Math.max(0, Math.min(attemptNumber - 1, BACKOFF_MINUTES.length - 1));
        return BACKOFF_MINUTES[idx];
    }
}
