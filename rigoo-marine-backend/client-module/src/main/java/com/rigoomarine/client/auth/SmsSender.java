package com.rigoomarine.client.auth;

/**
 * SMS provider abstraction. Mirrors the {@link com.rigoomarine.client.mail.MailSender}
 * shape so the OTP login feature can swap providers (LogSmsSender for dev,
 * TwilioSmsSender for prod, future AWS/Vonage/MessageBird as new impls).
 */
public interface SmsSender {
    /**
     * Send an SMS to the given E.164 number.
     * @param toE164  destination phone number, already normalized
     * @param body    message body (≤160 chars recommended; provider may segment)
     * @throws RuntimeException if the provider rejects the message; caller
     *         decides whether to roll back the OTP record (currently it does not).
     */
    void send(String toE164, String body);
}
