package com.rigoomarine.notification.whatsapp;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

/**
 * Dev stub — logs the WhatsApp message to stdout instead of calling an API.
 *
 * <p>Active when {@code app.whatsapp.enabled=true} AND
 * {@code app.whatsapp.provider=log}. Mirrors the {@code LogMailSender} pattern:
 * flip {@code WHATSAPP_PROVIDER=twilio|meta} to switch to a real provider without
 * changing any other code.
 *
 * <p>To test the WhatsApp flow locally without real credentials:
 * <pre>
 *   WHATSAPP_ENABLED=true
 *   WHATSAPP_PROVIDER=log
 * </pre>
 */
@Slf4j
@Component
@ConditionalOnExpression(
    "${app.whatsapp.enabled:false} == true " +
    "&& '${app.whatsapp.provider:twilio}'.equals('log')"
)
public class LogWhatsAppSender implements WhatsAppPort {

    @Override
    public void send(String toE164, String body) {
        log.info("\n==== [DEV WHATSAPP] ====\n  To: {}\n  Body:\n{}\n========================\n",
                toE164, body);
    }
}
