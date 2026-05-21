package com.rigoomarine.notification.whatsapp;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Twilio transport for WhatsApp. Active when {@code app.whatsapp.enabled=true}
 * AND {@code app.whatsapp.provider=twilio} (the default).
 *
 * <p>Same HTTP shape as client-module/TwilioSmsSender but with the
 * {@code whatsapp:} channel prefix on both From and To.
 *
 * <p>For the Meta Cloud API alternative see {@link MetaWhatsAppSender}.
 */
@Slf4j
@Component
@ConditionalOnExpression(
    "${app.whatsapp.enabled:false} == true " +
    "&& '${app.whatsapp.provider:twilio}'.equals('twilio')"
)
public class WhatsAppSender implements WhatsAppPort {

    private static final String API_HOST = "https://api.twilio.com";

    private final RestTemplate restTemplate = new RestTemplate();
    private final MeterRegistry meterRegistry;

    public WhatsAppSender(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Value("${app.whatsapp.twilio.account-sid:}")
    private String accountSid;

    @Value("${app.whatsapp.twilio.auth-token:}")
    private String authToken;

    /** Twilio WhatsApp sender, in {@code whatsapp:+E164} form. */
    @Value("${app.whatsapp.twilio.from:}")
    private String fromNumber;

    /**
     * Send a free-text WhatsApp message to {@code toE164} (raw E.164 phone,
     * the {@code whatsapp:} prefix is added here). Returns silently on
     * success; throws on misconfig or upstream rejection so the caller can
     * decide whether to retry (we don't from ServiceDueEventConsumer — a
     * WhatsApp failure is logged, not retried; email + in-app still landed).
     */
    public void send(String toE164, String body) {
        if (accountSid.isBlank() || authToken.isBlank() || fromNumber.isBlank()) {
            throw new IllegalStateException(
                "WhatsApp credentials missing: set app.whatsapp.twilio.{account-sid,auth-token,from}");
        }
        if (toE164 == null || toE164.isBlank()) {
            log.warn("whatsapp.send skipped — empty recipient phone");
            return;
        }

        String url = API_HOST + "/2010-04-01/Accounts/" + accountSid + "/Messages.json";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set(HttpHeaders.AUTHORIZATION, basicAuth(accountSid, authToken));

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("From", normaliseWhatsApp(fromNumber));
        form.add("To",   normaliseWhatsApp(toE164));
        form.add("Body", body);

        try {
            restTemplate.postForEntity(url, new HttpEntity<>(form, headers), String.class);
            log.info("whatsapp.sent provider=twilio recipient={}", mask(toE164));
            meterRegistry.counter("notification.whatsapp.sent.total", "provider", "twilio").increment();
        } catch (HttpStatusCodeException ex) {
            log.error("whatsapp.failed provider=twilio recipient={} status={} body={}",
                mask(toE164), ex.getStatusCode(), ex.getResponseBodyAsString());
            meterRegistry.counter("notification.whatsapp.failed.total", "provider", "twilio").increment();
            throw new RuntimeException("Twilio rejected WhatsApp: " + ex.getStatusCode(), ex);
        }
    }

    private static String normaliseWhatsApp(String phone) {
        if (phone == null) return null;
        return phone.startsWith("whatsapp:") ? phone : "whatsapp:" + phone;
    }

    private static String basicAuth(String user, String pass) {
        return "Basic " + Base64.getEncoder()
            .encodeToString((user + ":" + pass).getBytes(StandardCharsets.UTF_8));
    }

    private static String mask(String phone) {
        if (phone == null || phone.length() < 8) return "<short>";
        return phone.substring(0, 4) + "****" + phone.substring(phone.length() - 4);
    }
}
