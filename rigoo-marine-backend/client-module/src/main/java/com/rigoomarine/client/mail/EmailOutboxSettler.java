package com.rigoomarine.client.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Persists the post-attempt state of a redriven outbox row. Lives in its own
 * bean so Spring's transactional proxy applies — each settle is its own
 * {@code REQUIRES_NEW} transaction so a failure on one row doesn't poison
 * the rest of the batch the {@link EmailOutboxRedriver} is processing.
 *
 * <p>If these methods lived on the redriver itself, {@code this.settle…} from
 * {@code attempt(...)} would bypass the proxy and the {@code REQUIRES_NEW}
 * annotation would be silently ignored at runtime. The extraction makes the
 * transactional boundary load-bearing rather than aspirational.
 */
@Component
@RequiredArgsConstructor
public class EmailOutboxSettler {

    private static final long[] BACKOFF_MINUTES = { 5, 10, 20, 40, 60 };

    private final EmailOutboxRepository outboxRepository;

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

    /**
     * Per-row backoff curve in minutes, indexed by the NEW redrive-attempts
     * count after incrementing. Held here (not on the redriver) so the
     * settler is self-contained.
     */
    static long backoffMinutes(int attemptNumber) {
        int idx = Math.max(0, Math.min(attemptNumber - 1, BACKOFF_MINUTES.length - 1));
        return BACKOFF_MINUTES[idx];
    }
}
