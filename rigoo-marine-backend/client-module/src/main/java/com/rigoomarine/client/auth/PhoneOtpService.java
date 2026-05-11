package com.rigoomarine.client.auth;

import com.rigoomarine.client.entity.Client;
import com.rigoomarine.client.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Orchestration for SMS OTP login.
 *
 * <p>Contract is enumeration-safe: {@link #request} returns the same outcome
 * regardless of whether the phone matches an account; the SMS only goes to
 * real accounts but the response body is identical. {@link #verify} returns
 * the same {@link Outcome#OTP_INVALID} for "wrong code" and "no such phone"
 * so the verify endpoint also can't be used for enumeration.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PhoneOtpService {

    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final int CODE_DIGITS = 6;
    private static final SecureRandom RNG = new SecureRandom();

    private final PhoneOtpRepository otpRepository;
    private final ClientRepository clientRepository;
    private final SmsSender smsSender;
    private final TokenService tokenService;       // SHA-256 hash util
    private final OtpRateLimiter rateLimiter;

    public enum RequestOutcome { ACCEPTED, RATE_LIMITED }

    public enum Outcome { SUCCESS, OTP_INVALID, OTP_EXPIRED }

    public static class VerifyResult {
        public final Outcome outcome;
        public final Long clientId;
        public final String email;
        public VerifyResult(Outcome outcome, Long clientId, String email) {
            this.outcome = outcome;
            this.clientId = clientId;
            this.email = email;
        }
        public static VerifyResult fail(Outcome o) { return new VerifyResult(o, null, null); }
    }

    /**
     * Issues an OTP for the given normalized phone if the phone matches a real
     * client. The caller (controller) returns a generic success message either
     * way to prevent enumeration.
     */
    @Transactional
    public RequestOutcome request(String normalizedPhone, String locale, String ipAddress) {
        if (!rateLimiter.allow(normalizedPhone)) {
            log.info("otp.rate_limited phone={}", mask(normalizedPhone));
            return RequestOutcome.RATE_LIMITED;
        }

        Optional<Client> clientOpt = clientRepository.findByPhone(normalizedPhone);
        if (clientOpt.isEmpty()) {
            // Don't reveal — return ACCEPTED and skip the SMS. Same response
            // as the happy path; the only difference is the SMS doesn't fire.
            log.info("otp.skipped phone={} reason=no_account", mask(normalizedPhone));
            return RequestOutcome.ACCEPTED;
        }

        // Invalidate any prior live codes for this phone so the user only ever
        // has one usable code in flight.
        otpRepository.invalidateActiveForPhone(normalizedPhone, LocalDateTime.now());

        String code = generateNumericCode(CODE_DIGITS);
        PhoneOtpEntry entry = PhoneOtpEntry.builder()
            .phone(normalizedPhone)
            .codeHash(tokenService.hash(code))
            .expiresAt(LocalDateTime.now().plus(OTP_TTL))
            .locale(locale)
            .ipAddress(ipAddress)
            .build();
        otpRepository.save(entry);

        try {
            smsSender.send(normalizedPhone, bodyFor(locale, code));
            log.info("otp.sent phone={} entryId={}", mask(normalizedPhone), entry.getId());
        } catch (RuntimeException smsFailure) {
            // The DB row exists; user can retry the /otp/request endpoint and
            // get a new code (which will invalidate this one). Don't surface
            // a 500 to the caller — that would leak "this phone exists".
            log.error("otp.sms_failed phone={} cause={}", mask(normalizedPhone), smsFailure.toString());
        }
        return RequestOutcome.ACCEPTED;
    }

    /**
     * Verifies a submitted code against the most recent live OTP for the phone.
     * Increments {@code attempts} on mismatch; stamps {@code used_at} on success;
     * returns the matched client identity for JWT issuance.
     */
    @Transactional
    public VerifyResult verify(String normalizedPhone, String submittedCode) {
        if (submittedCode == null || submittedCode.isBlank()) {
            return VerifyResult.fail(Outcome.OTP_INVALID);
        }

        LocalDateTime now = LocalDateTime.now();
        Optional<PhoneOtpEntry> entryOpt = otpRepository
            .findFirstByPhoneAndUsedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(normalizedPhone, now);

        if (entryOpt.isEmpty()) {
            // Could be "no such code" or "expired" — we still return OTP_INVALID
            // here to maintain enumeration safety. Real expiry signal goes via
            // the request flow, not via the verify endpoint.
            return VerifyResult.fail(Outcome.OTP_INVALID);
        }

        PhoneOtpEntry entry = entryOpt.get();
        if (entry.getAttempts() >= entry.getMaxAttempts()) {
            log.warn("otp.attempts_exhausted phone={} entryId={}", mask(normalizedPhone), entry.getId());
            return VerifyResult.fail(Outcome.OTP_INVALID);
        }

        if (!tokenService.verify(submittedCode, entry.getCodeHash())) {
            entry.setAttempts(entry.getAttempts() + 1);
            otpRepository.save(entry);
            if (entry.getAttempts() >= entry.getMaxAttempts()) {
                log.warn("otp.lockout phone={} entryId={}", mask(normalizedPhone), entry.getId());
            }
            return VerifyResult.fail(Outcome.OTP_INVALID);
        }

        // Success. Single-use: stamp used_at so a duplicate verify fails.
        entry.setUsedAt(LocalDateTime.now());
        otpRepository.save(entry);

        Client client = clientRepository.findByPhone(normalizedPhone)
            .orElseThrow(() -> new IllegalStateException(
                "Phone matched an OTP but no client — data inconsistency for " + mask(normalizedPhone)));
        return new VerifyResult(Outcome.SUCCESS, client.getId(), client.getEmail());
    }

    static String generateNumericCode(int digits) {
        StringBuilder sb = new StringBuilder(digits);
        for (int i = 0; i < digits; i++) sb.append(RNG.nextInt(10));
        return sb.toString();
    }

    private static String bodyFor(String locale, String code) {
        if ("ar".equalsIgnoreCase(locale)) {
            return "رمز التحقق الخاص بك في ريغو مارين هو: " + code + ". صالح لمدة 5 دقائق.";
        }
        return "Your Rigoo Marine verification code is " + code + ". Valid for 5 minutes.";
    }

    private static String mask(String phone) {
        if (phone == null || phone.length() < 8) return "<short>";
        return phone.substring(0, 4) + "****" + phone.substring(phone.length() - 4);
    }
}
