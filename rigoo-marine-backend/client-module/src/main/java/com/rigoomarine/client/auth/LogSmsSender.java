package com.rigoomarine.client.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Dev fallback: writes the SMS body (including the OTP code) to logs so QA
 * can recover the code without a real SMS provider.
 *
 * <p>Active when {@code app.sms.enabled} is unset or false. In production this
 * must be {@code true} — running with LogSmsSender in prod leaks codes in logs.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.sms.enabled", havingValue = "false", matchIfMissing = true)
public class LogSmsSender implements SmsSender {

    @Override
    public void send(String toE164, String body) {
        log.info("\n==== [DEV SMS] ====\n  To: {}\n  Body: {}\n===================\n",
            toE164, body);
    }
}
