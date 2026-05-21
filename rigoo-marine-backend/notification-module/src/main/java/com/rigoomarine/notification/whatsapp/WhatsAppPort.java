package com.rigoomarine.notification.whatsapp;

/**
 * Abstraction over WhatsApp transport providers.
 * Implementations: {@link TwilioWhatsAppSender} (default), {@link MetaWhatsAppSender}.
 * Toggle via {@code app.whatsapp.provider=twilio|meta}.
 */
public interface WhatsAppPort {
    /**
     * Send a free-form text message. {@code toE164} is the recipient phone in
     * E.164 format (e.g. "+97450123456"). Implementations normalise as needed
     * (Twilio prefixes "whatsapp:", Meta strips the "+").
     */
    void send(String toE164, String body);
}
