package com.rigoomarine.client.auth;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Dev fallback: writes the SMS body (including the OTP code) to logs so QA
 * can recover the code without a real SMS provider.
 *
 * <p>Active when {@code app.sms.enabled} is unset or false. <strong>Refuses to start
 * in production profiles</strong> via a {@link PostConstruct} guard: an OTP
 * code in logs is sufficient to hijack the SMS-OTP login flow. Set
 * {@code app.sms.enabled=true} (and configure {@code TwilioSmsSender}) to ship
 * to prod; the override {@code app.log-sender.allow-in-prod=true} is the
 * emergency drill escape hatch.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.sms.enabled", havingValue = "false", matchIfMissing = true)
public class LogSmsSender implements SmsSender {

    private final Environment environment;
    private final boolean allowInProd;
    private final Set<String> prodProfiles;

    public LogSmsSender(
            Environment environment,
            @Value("${app.log-sender.allow-in-prod:false}") boolean allowInProd,
            @Value("${app.log-sender.prod-profiles:prod,production,live}") String prodProfilesCsv
    ) {
        this.environment = environment;
        this.allowInProd = allowInProd;
        this.prodProfiles = Arrays.stream(prodProfilesCsv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(String::toLowerCase)
            .collect(Collectors.toCollection(HashSet::new));
    }

    @PostConstruct
    void refuseToRunInProd() {
        List<String> active = Arrays.stream(environment.getActiveProfiles())
            .map(String::toLowerCase)
            .collect(Collectors.toList());
        List<String> matched = active.stream()
            .filter(prodProfiles::contains)
            .collect(Collectors.toList());

        if (matched.isEmpty()) return;

        if (allowInProd) {
            log.warn("LogSmsSender allowed in production profile {} via app.log-sender.allow-in-prod=true. " +
                "SMS bodies (including OTP codes) will be written to logs.", matched);
            return;
        }

        throw new IllegalStateException(
            "LogSmsSender refused to start in production profile " + matched + ".\n" +
            "SMS bodies (including OTP codes) would be written to logs, exposing codes that\n" +
            "are sufficient on their own to hijack accounts via the SMS-OTP login flow.\n" +
            "Set app.sms.enabled=true and configure TwilioSmsSender, or set\n" +
            "app.log-sender.allow-in-prod=true if this is an intentional drill.");
    }

    @Override
    public void send(String toE164, String body) {
        log.info("\n==== [DEV SMS] ====\n  To: {}\n  Body: {}\n===================\n",
            toE164, body);
    }
}
