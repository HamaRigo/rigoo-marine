package com.rigoomarine.client.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * One-click email unsubscribe. Public — no JWT, no session. The opaque
 * {@code unsubscribe_token} (V9 migration) IS the credential; lookup is via
 * the unique index {@code ux_clients_unsub_token}.
 *
 * <p>Two-step UX:
 * <ul>
 *   <li>{@code GET /unsubscribe?t=<token>} — landing page with a confirm form.
 *       Returns minimal inline HTML; styled enough to feel intentional, not
 *       so heavy that it pulls in a templating engine.</li>
 *   <li>{@code POST /unsubscribe?t=<token>} — flips notifications_paused=TRUE
 *       and shows the confirmation page.</li>
 * </ul>
 *
 * <p>Why a confirm step instead of GET-flips-the-flag: email clients pre-fetch
 * URLs to scan for spam/safety, and an unguarded GET would flip the flag on
 * every prefetch. A second POST request gated by user confirmation is the
 * RFC-aligned answer (POST = state-changing, GET = safe).
 *
 * <p>HTML is inline + minimal (no Thymeleaf dep). Bilingual via the {@code lang}
 * query param; defaults to EN.
 */
@RestController
@RequestMapping("/unsubscribe")
@RequiredArgsConstructor
@Slf4j
public class PublicUnsubscribeController {

    private final JdbcTemplate jdbc;

    @GetMapping(produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> landing(
            @RequestParam(name = "t", required = false) String token,
            @RequestParam(name = "lang", required = false, defaultValue = "en") String lang
    ) {
        if (token == null || token.isBlank() || !exists(token)) {
            return ResponseEntity.status(404).body(htmlMissing(lang));
        }
        return ResponseEntity.ok(htmlLanding(token, lang));
    }

    @PostMapping(produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> confirm(
            @RequestParam(name = "t", required = false) String token,
            @RequestParam(name = "lang", required = false, defaultValue = "en") String lang
    ) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(404).body(htmlMissing(lang));
        }
        int rows = jdbc.update(
            "UPDATE clients SET notifications_paused = TRUE, updated_at = NOW() WHERE unsubscribe_token = ?",
            token
        );
        if (rows == 0) {
            return ResponseEntity.status(404).body(htmlMissing(lang));
        }
        log.info("client.unsubscribed token={}", obfuscate(token));
        return ResponseEntity.ok(htmlDone(lang));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private boolean exists(String token) {
        Integer n = jdbc.queryForObject(
            "SELECT COUNT(*) FROM clients WHERE unsubscribe_token = ?", Integer.class, token);
        return n != null && n > 0;
    }

    /** Mask the middle of the token for log safety. Tokens are 36-char UUIDs. */
    private static String obfuscate(String t) {
        if (t == null || t.length() < 8) return "***";
        return t.substring(0, 4) + "…" + t.substring(t.length() - 4);
    }

    private static String htmlLanding(String token, String lang) {
        boolean ar = "ar".equalsIgnoreCase(lang);
        String dir = ar ? "rtl" : "ltr";
        String h1 = ar ? "إلغاء الاشتراك من التذكيرات" : "Unsubscribe from reminders";
        String p  = ar
            ? "اضغط الزر أدناه لإيقاف رسائل البريد الإلكتروني من Rigoo Marine. لن يؤثر هذا على إشعارات التطبيق."
            : "Click below to stop email reminders from Rigoo Marine. In-app notifications are unaffected.";
        String btn = ar ? "تأكيد إلغاء الاشتراك" : "Confirm unsubscribe";
        return page(dir, h1,
            "<p>" + p + "</p>" +
            "<form method=\"post\" action=\"/unsubscribe?lang=" + lang + "\">" +
              "<input type=\"hidden\" name=\"t\" value=\"" + escape(token) + "\">" +
              "<input type=\"hidden\" name=\"lang\" value=\"" + escape(lang) + "\">" +
              "<button type=\"submit\" style=\"" + BTN_STYLE + "\">" + btn + "</button>" +
            "</form>");
    }

    private static String htmlDone(String lang) {
        boolean ar = "ar".equalsIgnoreCase(lang);
        String dir = ar ? "rtl" : "ltr";
        String h1 = ar ? "تم إلغاء الاشتراك" : "You're unsubscribed";
        String p  = ar
            ? "لن تتلقى رسائل بريد إلكتروني للتذكير بعد الآن. لإعادة التفعيل، يمكنك تعديل تفضيلاتك من إعدادات الحساب."
            : "We've stopped sending you reminder emails. To opt back in, update your communication preferences in your account settings.";
        return page(dir, h1, "<p>" + p + "</p>");
    }

    private static String htmlMissing(String lang) {
        boolean ar = "ar".equalsIgnoreCase(lang);
        String dir = ar ? "rtl" : "ltr";
        String h1 = ar ? "رابط غير صالح" : "Invalid link";
        String p  = ar
            ? "هذا الرابط لم يعد صالحاً. إذا كنت ترغب في إلغاء الاشتراك، يرجى التواصل مع الدعم."
            : "That link is no longer valid. To unsubscribe, please contact support.";
        return page(dir, h1, "<p>" + p + "</p>");
    }

    // Minimal inline CSS — no external CDN, no templating engine. Survives
    // any email client's image/JS sandboxing because the landing page is
    // opened in the user's full browser, not in the email.
    private static final String BTN_STYLE =
        "background:#006994;color:#fff;border:0;padding:0.75rem 1.5rem;font-size:1rem;border-radius:6px;cursor:pointer";

    private static String page(String dir, String h1, String body) {
        return """
            <!doctype html>
            <html dir="%s">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>%s</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                         max-width: 480px; margin: 4rem auto; padding: 0 1rem; color: #1f2937; }
                  h1 { color: #006994; }
                  p  { line-height: 1.5; }
                </style>
              </head>
              <body>
                <h1>%s</h1>
                %s
              </body>
            </html>
            """.formatted(escape(dir), escape(h1), escape(h1), body);
    }

    /** Bare-minimum HTML-attribute escape — the inputs we splice are tokens + lang. */
    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;");
    }
}
