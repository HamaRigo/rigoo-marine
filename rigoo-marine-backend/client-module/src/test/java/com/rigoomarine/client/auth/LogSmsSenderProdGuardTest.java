package com.rigoomarine.client.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Mirror of {@code LogMailSenderProdGuardTest} for the SMS path. The OTP-code
 * leak the guard prevents is the higher-impact case of the pair (a single
 * 6-digit code is a complete account-hijack credential on the SMS-OTP flow),
 * so we lock the same contract independently here.
 */
class LogSmsSenderProdGuardTest {

    private static final String DEFAULT_PROFILES = "prod,production,live";

    @Test
    void allowsDev_whenNoProfileMatchesProd() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");
        LogSmsSender sender = new LogSmsSender(env, false, DEFAULT_PROFILES);

        assertDoesNotThrow(sender::refuseToRunInProd);
    }

    @Test
    void allowsTest_whenNoActiveProfileSet() {
        MockEnvironment env = new MockEnvironment();
        LogSmsSender sender = new LogSmsSender(env, false, DEFAULT_PROFILES);

        assertDoesNotThrow(sender::refuseToRunInProd);
    }

    @Test
    void refusesToStart_whenProdProfileActive() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        LogSmsSender sender = new LogSmsSender(env, false, DEFAULT_PROFILES);

        IllegalStateException ex = assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
        assertTrue(ex.getMessage().contains("LogSmsSender refused to start"));
        assertTrue(ex.getMessage().contains("OTP"));
        assertTrue(ex.getMessage().contains("app.sms.enabled=true"));
    }

    @Test
    void refusesToStart_whenProductionProfileActive() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");
        LogSmsSender sender = new LogSmsSender(env, false, DEFAULT_PROFILES);

        assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
    }

    @Test
    void refusesToStart_caseInsensitively() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("LIVE");
        LogSmsSender sender = new LogSmsSender(env, false, DEFAULT_PROFILES);

        assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
    }

    @Test
    void refusesToStart_whenProdMixedWithBenignProfiles() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("metrics", "prod", "tracing");
        LogSmsSender sender = new LogSmsSender(env, false, DEFAULT_PROFILES);

        assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
    }

    @Test
    void allowsProd_whenAllowInProdOverrideTrue() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        LogSmsSender sender = new LogSmsSender(env, true, DEFAULT_PROFILES);

        assertDoesNotThrow(sender::refuseToRunInProd);
    }

    @Test
    void respectsCustomProdProfileSet() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("aws-prod");
        LogSmsSender sender = new LogSmsSender(env, false, "aws-prod,aws-prod-eu");

        assertThrows(IllegalStateException.class, sender::refuseToRunInProd);
    }
}
