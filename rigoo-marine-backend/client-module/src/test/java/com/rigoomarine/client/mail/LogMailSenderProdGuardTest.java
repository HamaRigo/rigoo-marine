package com.rigoomarine.client.mail;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Locks the {@code @PostConstruct} guard contract: LogMailSender refuses to
 * start under a prod-named profile unless the operator explicitly opts in via
 * {@code app.log-sender.allow-in-prod=true}.
 *
 * <p>We invoke the guard method directly (it's package-private) rather than
 * standing up a full Spring context — the method's logic is what we need to
 * lock, not the lifecycle integration (which is Spring's responsibility).
 */
class LogMailSenderProdGuardTest {

    private static final String DEFAULT_PROFILES = "prod,production,live";

    @Test
    void allowsDev_whenNoProfileMatchesProd() {
        MockEnvironment env = new MockEnvironment().withProperty("dummy", "value");
        env.setActiveProfiles("dev");
        LogMailSender sender = new LogMailSender(env, false, DEFAULT_PROFILES);

        assertDoesNotThrow(sender::refuseToRunInProd);
    }

    @Test
    void allowsTest_whenNoActiveProfileSet() {
        MockEnvironment env = new MockEnvironment();
        // No setActiveProfiles call → empty active profiles.
        LogMailSender sender = new LogMailSender(env, false, DEFAULT_PROFILES);

        assertDoesNotThrow(sender::refuseToRunInProd);
    }

    @Test
    void refusesToStart_whenProdProfileActive() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        LogMailSender sender = new LogMailSender(env, false, DEFAULT_PROFILES);

        IllegalStateException ex = assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
        assertTrue(ex.getMessage().contains("LogMailSender refused to start"));
        assertTrue(ex.getMessage().contains("prod"));
        assertTrue(ex.getMessage().contains("app.mail.enabled=true"));
    }

    @Test
    void refusesToStart_whenProductionProfileActive() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");
        LogMailSender sender = new LogMailSender(env, false, DEFAULT_PROFILES);

        assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
    }

    @Test
    void refusesToStart_whenLiveProfileActive() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("live");
        LogMailSender sender = new LogMailSender(env, false, DEFAULT_PROFILES);

        assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
    }

    @Test
    void refusesToStart_caseInsensitively() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("Prod", "Monitoring");
        LogMailSender sender = new LogMailSender(env, false, DEFAULT_PROFILES);

        assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
    }

    @Test
    void refusesToStart_whenProdMixedWithBenignProfiles() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("monitoring", "prod", "feature-flags");
        LogMailSender sender = new LogMailSender(env, false, DEFAULT_PROFILES);

        assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
    }

    @Test
    void allowsProd_whenAllowInProdOverrideTrue_butLogsWarning() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        LogMailSender sender = new LogMailSender(env, true, DEFAULT_PROFILES);

        // Override path: starts cleanly. The log assertion would require
        // wiring a test appender; the no-throw assertion is the contract.
        assertDoesNotThrow(sender::refuseToRunInProd);
    }

    @Test
    void respectsCustomProdProfileSet() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("gcp-prod-eu");
        // Default "prod,production,live" doesn't match; this is an org-specific
        // name. Custom set should make the guard trip.
        LogMailSender sender = new LogMailSender(env, false, "gcp-prod-eu,gcp-prod-us");

        assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
    }

    @Test
    void handlesEmptyProdProfilesProperty_asEffectivelyDisabledGuard() {
        // Org explicitly clears the prod-profile set (unusual but valid).
        // Result: nothing matches, guard becomes a no-op even under "prod".
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        LogMailSender sender = new LogMailSender(env, false, "");

        assertDoesNotThrow(sender::refuseToRunInProd);
    }
}
