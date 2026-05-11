package com.rigoomarine.client.mail;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Micrometer counters for mail dispatch outcomes. Tagged by template name +
 * outcome so dashboards can surface per-template failure rates (e.g. is
 * EMAIL_VERIFY failing while PASSWORD_RESET succeeds, indicating a
 * provider-side rule against signup keywords?).
 */
@Component
public class MailMetrics {

    private final MeterRegistry registry;

    public MailMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public void recordAttempt(String template) {
        counter(template, "attempt").increment();
    }

    public void recordSuccess(String template) {
        counter(template, "success").increment();
    }

    /** First attempt failed, a later attempt succeeded — useful for SLO calculations. */
    public void recordRetriedSuccess(String template) {
        counter(template, "retried").increment();
    }

    public void recordFailure(String template) {
        counter(template, "failed").increment();
    }

    public void recordOutboxWriteFailure() {
        registry.counter("mail.outbox.write.failed").increment();
    }

    public void recordRedriveSuccess(String template) {
        outboxCounter(template, "success").increment();
    }

    public void recordRedriveFailure(String template) {
        outboxCounter(template, "failed").increment();
    }

    public void recordDead(String template) {
        outboxCounter(template, "dead").increment();
    }

    private Counter outboxCounter(String template, String outcome) {
        return registry.counter("mail.outbox.redrive.total",
            "template", template == null ? "unknown" : template,
            "outcome", outcome);
    }

    private Counter counter(String template, String outcome) {
        return registry.counter("mail.send.total",
            "template", template == null ? "unknown" : template,
            "outcome", outcome);
    }
}
