package com.rigoomarine.notification.whatsapp;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
 * Sends WhatsApp messages via Twilio's Messaging API. Same HTTP shape as
 * {@code client-module/TwilioSmsSender} but with the {@code whatsapp:}
 * channel prefix on both From and To.
 *
 * <p>Why a fresh component instead of reusing TwilioSmsSender:
 * <ul>
 *   <li>The "From" number is a separate WhatsApp-enabled Twilio sender —
 *       different config key, often a different Twilio account.</li>
 *   <li>SMS is hot-path login (OTP); WhatsApp is best-effort notification
 *       fan-out. Mixing them risks SMS failures on the notification path
 *       (or WhatsApp template approvals blocking OTP delivery).</li>
 *   <li>notification-module already owns its mail send infra; symmetric
 *       to add its own WhatsApp sender here.</li>
 * </ul>
 *
 * <p>Active when {@code app.whatsapp.enabled=true}. All three creds must
 * be set; missing creds throw at send-time so misconfig surfaces loudly
 * during the first reminder cycle rather than weeks later.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.whatsapp.enabled", havingValue = "true")
public class WhatsAppSender {

    private static final String API_HOST = "https://api.twilio.com";

    private final RestTemplate restTemplate = new RestTemplate();

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
            log.info("whatsapp.sent recipient={}", mask(toE164));
        } catch (HttpStatusCodeException ex) {
            log.error("whatsapp.failed recipient={} status={} body={}",
                mask(toE164), ex.getStatusCode(), ex.getResponseBodyAsString());
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
