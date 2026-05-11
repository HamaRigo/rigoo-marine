package com.rigoomarine.client.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Sends SMS via Twilio's Messaging API. We deliberately avoid the official
 * Twilio Java SDK — it pulls in significant transitive deps for a single HTTP
 * call. {@link RestTemplate} + form-urlencoded body + HTTP Basic auth is all
 * the API requires.
 *
 * <p>Active when {@code app.sms.enabled=true} and {@code app.sms.provider=twilio}
 * (or unset, since Twilio is the default).
 *
 * <p>Config:
 * <ul>
 *   <li>{@code app.sms.twilio.account-sid}</li>
 *   <li>{@code app.sms.twilio.auth-token}</li>
 *   <li>{@code app.sms.twilio.from} — verified sending number, E.164</li>
 * </ul>
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.sms.enabled", havingValue = "true")
public class TwilioSmsSender implements SmsSender {

    private static final String API_HOST = "https://api.twilio.com";

    private final RestTemplate restTemplate;

    @Value("${app.sms.twilio.account-sid:}")
    private String accountSid;

    @Value("${app.sms.twilio.auth-token:}")
    private String authToken;

    @Value("${app.sms.twilio.from:}")
    private String fromNumber;

    public TwilioSmsSender() {
        this.restTemplate = new RestTemplate();
    }

    @Override
    public void send(String toE164, String body) {
        if (accountSid.isBlank() || authToken.isBlank() || fromNumber.isBlank()) {
            throw new IllegalStateException(
                "Twilio credentials missing: set app.sms.twilio.{account-sid,auth-token,from}");
        }

        String url = API_HOST + "/2010-04-01/Accounts/" + accountSid + "/Messages.json";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set(HttpHeaders.AUTHORIZATION, basicAuth(accountSid, authToken));

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("From", fromNumber);
        form.add("To", toE164);
        form.add("Body", body);

        try {
            restTemplate.postForEntity(url, new HttpEntity<>(form, headers), String.class);
            log.info("sms.sent provider=twilio recipient={}", mask(toE164));
        } catch (HttpStatusCodeException ex) {
            log.error("sms.failed provider=twilio recipient={} status={} body={}",
                mask(toE164), ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new RuntimeException("Twilio rejected SMS: " + ex.getStatusCode(), ex);
        }
    }

    private static String basicAuth(String user, String pass) {
        String credentials = user + ":" + pass;
        return "Basic " + Base64.getEncoder()
            .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }

    /** Mask middle of a phone for logs: {@code +974****3456}. */
    private static String mask(String phone) {
        if (phone == null || phone.length() < 8) return "<short>";
        return phone.substring(0, 4) + "****" + phone.substring(phone.length() - 4);
    }
}
