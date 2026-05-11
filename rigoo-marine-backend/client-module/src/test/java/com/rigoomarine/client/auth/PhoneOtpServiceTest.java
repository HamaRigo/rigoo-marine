package com.rigoomarine.client.auth;

import com.rigoomarine.client.entity.Client;
import com.rigoomarine.client.repository.ClientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhoneOtpServiceTest {

    @Mock private PhoneOtpRepository otpRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private SmsSender smsSender;

    /**
     * Mockito's inline mocker can't subclass OtpRateLimiter under Java 23.
     * Hand-rolled stub instead — same shape, tests pin the allow() outcome
     * per-phone via the map.
     */
    private static class StubRateLimiter extends OtpRateLimiter {
        final Map<String, Boolean> allowByPhone = new HashMap<>();
        StubRateLimiter() {
            // Pass a null-returning ObjectProvider since we override allow() anyway.
            super(new org.springframework.beans.factory.ObjectProvider<>() {
                @Override public org.springframework.data.redis.core.StringRedisTemplate getObject() { return null; }
                @Override public org.springframework.data.redis.core.StringRedisTemplate getObject(Object... args) { return null; }
                @Override public org.springframework.data.redis.core.StringRedisTemplate getIfAvailable() { return null; }
                @Override public org.springframework.data.redis.core.StringRedisTemplate getIfUnique() { return null; }
            });
        }
        @Override public boolean allow(String phone) {
            return allowByPhone.getOrDefault(phone, true);
        }
    }

    private TokenService tokenService;
    private StubRateLimiter rateLimiter;
    private PhoneOtpService service;

    @BeforeEach
    void setUp() {
        tokenService = new TokenService();
        rateLimiter = new StubRateLimiter();
        service = new PhoneOtpService(otpRepository, clientRepository, smsSender, tokenService, rateLimiter);
    }

    @Test
    void request_acceptedAndSendsSms_whenPhoneIsRegistered() {
        rateLimiter.allowByPhone.put("+97455123456", true);
        when(clientRepository.findByPhone("+97455123456")).thenReturn(Optional.of(makeClient(1L, "u@x.com")));

        PhoneOtpService.RequestOutcome out =
            service.request("+97455123456", "en", "1.2.3.4");

        assertEquals(PhoneOtpService.RequestOutcome.ACCEPTED, out);
        verify(otpRepository).invalidateActiveForPhone(eq("+97455123456"), any());
        verify(otpRepository).save(any(PhoneOtpEntry.class));
        ArgumentCaptor<String> bodyCap = ArgumentCaptor.forClass(String.class);
        verify(smsSender).send(eq("+97455123456"), bodyCap.capture());
        assertTrue(Pattern.compile("\\d{6}").matcher(bodyCap.getValue()).find(),
            "SMS body must contain a 6-digit code");
    }

    @Test
    void request_acceptedButNoSms_whenPhoneIsUnknown() {
        rateLimiter.allowByPhone.put("+97455999999", true);
        when(clientRepository.findByPhone("+97455999999")).thenReturn(Optional.empty());

        PhoneOtpService.RequestOutcome out =
            service.request("+97455999999", "en", "1.2.3.4");

        assertEquals(PhoneOtpService.RequestOutcome.ACCEPTED, out,
            "Same response as the happy path — enumeration-safe");
        verifyNoInteractions(smsSender);
        verify(otpRepository, never()).save(any());
    }

    @Test
    void request_rateLimited_whenPerPhoneBudgetExceeded() {
        rateLimiter.allowByPhone.put("+97455123456", false);

        PhoneOtpService.RequestOutcome out =
            service.request("+97455123456", "en", "1.2.3.4");

        assertEquals(PhoneOtpService.RequestOutcome.RATE_LIMITED, out);
        verifyNoInteractions(clientRepository, smsSender);
    }

    @Test
    void request_acceptedButSmsFailureSwallowed_doesNotReveal() {
        rateLimiter.allowByPhone.put("+97455123456", true);
        when(clientRepository.findByPhone(anyString())).thenReturn(Optional.of(makeClient(1L, "u@x.com")));
        doThrow(new RuntimeException("twilio 502")).when(smsSender).send(anyString(), anyString());

        PhoneOtpService.RequestOutcome out =
            service.request("+97455123456", "en", "1.2.3.4");

        assertEquals(PhoneOtpService.RequestOutcome.ACCEPTED, out,
            "SMS dispatch failure must not leak the existence of the phone");
        verify(otpRepository).save(any(PhoneOtpEntry.class)); // row still written; user can retry
    }

    @Test
    void verify_returnsSuccess_onMatchingActiveCode() {
        String code = "123456";
        PhoneOtpEntry entry = activeEntry(tokenService.hash(code));
        when(otpRepository.findFirstByPhoneAndUsedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("+97455123456"), any())).thenReturn(Optional.of(entry));
        when(clientRepository.findByPhone("+97455123456"))
            .thenReturn(Optional.of(makeClient(42L, "u@x.com")));

        PhoneOtpService.VerifyResult result = service.verify("+97455123456", code);

        assertEquals(PhoneOtpService.Outcome.SUCCESS, result.outcome);
        assertEquals(42L, result.clientId);
        assertEquals("u@x.com", result.email);
        ArgumentCaptor<PhoneOtpEntry> saveCap = ArgumentCaptor.forClass(PhoneOtpEntry.class);
        verify(otpRepository).save(saveCap.capture());
        assertNotNull(saveCap.getValue().getUsedAt(), "must stamp usedAt on success");
    }

    @Test
    void verify_returnsInvalid_onWrongCode_andBumpsAttempts() {
        PhoneOtpEntry entry = activeEntry(tokenService.hash("123456"));
        when(otpRepository.findFirstByPhoneAndUsedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
                anyString(), any())).thenReturn(Optional.of(entry));

        PhoneOtpService.VerifyResult result = service.verify("+97455123456", "000000");

        assertEquals(PhoneOtpService.Outcome.OTP_INVALID, result.outcome);
        assertEquals(1, entry.getAttempts(), "attempts incremented");
        verify(otpRepository).save(entry);
    }

    @Test
    void verify_returnsInvalid_whenAttemptsExhausted() {
        PhoneOtpEntry entry = activeEntry(tokenService.hash("123456"));
        entry.setAttempts(5); // cap reached
        when(otpRepository.findFirstByPhoneAndUsedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
                anyString(), any())).thenReturn(Optional.of(entry));

        PhoneOtpService.VerifyResult result = service.verify("+97455123456", "123456");

        assertEquals(PhoneOtpService.Outcome.OTP_INVALID, result.outcome,
            "Correct code is rejected once attempts cap is reached");
        verify(otpRepository, never()).save(any());
    }

    @Test
    void verify_returnsInvalid_whenNoActiveEntry() {
        when(otpRepository.findFirstByPhoneAndUsedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
                anyString(), any())).thenReturn(Optional.empty());

        PhoneOtpService.VerifyResult result = service.verify("+97455123456", "123456");

        assertEquals(PhoneOtpService.Outcome.OTP_INVALID, result.outcome);
        verifyNoInteractions(clientRepository);
    }

    @Test
    void verify_returnsInvalid_onNullOrBlankCode() {
        assertEquals(PhoneOtpService.Outcome.OTP_INVALID, service.verify("+97455123456", null).outcome);
        assertEquals(PhoneOtpService.Outcome.OTP_INVALID, service.verify("+97455123456", "   ").outcome);
        verifyNoInteractions(otpRepository);
    }

    @Test
    void generateNumericCode_isAlwaysSixDigits() {
        for (int i = 0; i < 50; i++) {
            String c = PhoneOtpService.generateNumericCode(6);
            assertEquals(6, c.length());
            assertTrue(c.matches("\\d{6}"));
        }
    }

    // ---------- helpers ----------

    private Client makeClient(Long id, String email) {
        Client c = new Client();
        c.setId(id);
        c.setEmail(email);
        c.setRole(Client.UserRole.CLIENT);
        return c;
    }

    private PhoneOtpEntry activeEntry(String codeHash) {
        return PhoneOtpEntry.builder()
            .id(1L)
            .phone("+97455123456")
            .codeHash(codeHash)
            .attempts(0)
            .maxAttempts(5)
            .expiresAt(LocalDateTime.now().plusMinutes(5))
            .build();
    }
}
