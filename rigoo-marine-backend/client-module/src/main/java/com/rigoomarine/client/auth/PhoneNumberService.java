package com.rigoomarine.client.auth;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;
import org.springframework.stereotype.Service;

/**
 * Normalize phone numbers to E.164 (e.g. "+97412345678").
 *
 * Default region: QA. Inputs without a "+" are parsed as Qatari numbers.
 * Inputs with "+" are parsed as international.
 * Invalid inputs throw IllegalArgumentException — caller decides whether to fail or warn.
 */
@Service
public class PhoneNumberService {

    private static final String DEFAULT_REGION = "QA";
    private final PhoneNumberUtil util = PhoneNumberUtil.getInstance();

    /**
     * @return the input normalized to E.164.
     * @throws IllegalArgumentException if the input cannot be parsed as a valid phone number.
     */
    public String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Phone number is required");
        }
        try {
            Phonenumber.PhoneNumber parsed = util.parse(raw.trim(), DEFAULT_REGION);
            if (!util.isValidNumber(parsed)) {
                throw new IllegalArgumentException("Phone number is not valid: " + raw);
            }
            return util.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException e) {
            throw new IllegalArgumentException("Could not parse phone number: " + raw, e);
        }
    }

    /**
     * Best-effort variant for migration code: returns the input unchanged
     * if normalization fails (caller logs + skips), null only if input is null/blank.
     */
    public String normalizeOrOriginal(String raw) {
        if (raw == null || raw.isBlank()) return raw;
        try {
            return normalize(raw);
        } catch (IllegalArgumentException e) {
            return raw;
        }
    }
}
