package com.rigoomarine.client.mail;

import com.rigoomarine.client.entity.ContactInfo;
import com.rigoomarine.client.repository.ContactInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailConfigService {

    static final String KEY_HOST    = "smtp_host";
    static final String KEY_PORT    = "smtp_port";
    static final String KEY_USER    = "smtp_user";
    static final String KEY_PASS    = "smtp_password";
    static final String KEY_FROM    = "smtp_from";
    static final String KEY_ENABLED = "smtp_enabled";

    private final ContactInfoRepository repo;

    @Value("${SPRING_MAIL_HOST:smtp.gmail.com}")  private String envHost;
    @Value("${SPRING_MAIL_PORT:587}")             private int    envPort;
    @Value("${SPRING_MAIL_USERNAME:}")            private String envUsername;
    @Value("${SPRING_MAIL_PASSWORD:}")            private String envPassword;
    @Value("${MAIL_FROM:no-reply@rigoomarine.com}") private String envFrom;
    @Value("${MAIL_ENABLED:false}")               private boolean envEnabled;

    private volatile MailConfig cached;
    private volatile long cacheExpiry = 0;
    private static final long TTL_MS = 60_000;

    public MailConfig getConfig() {
        if (cached == null || System.currentTimeMillis() > cacheExpiry) {
            cached = loadFromDb();
            cacheExpiry = System.currentTimeMillis() + TTL_MS;
        }
        return cached;
    }

    public void invalidateCache() {
        cached = null;
        cacheExpiry = 0;
    }

    public void saveConfig(MailConfig cfg) {
        upsert(KEY_ENABLED, String.valueOf(cfg.isEnabled()));
        upsert(KEY_HOST,    cfg.getHost());
        upsert(KEY_PORT,    String.valueOf(cfg.getPort()));
        upsert(KEY_USER,    cfg.getUsername());
        if (cfg.getPassword() != null && !cfg.getPassword().isBlank()) {
            upsert(KEY_PASS, cfg.getPassword());
        }
        upsert(KEY_FROM, cfg.getFrom());
        invalidateCache();
        log.info("smtp.config.saved enabled={} host={} user={}", cfg.isEnabled(), cfg.getHost(), cfg.getUsername());
    }

    private MailConfig loadFromDb() {
        Map<String, String> kv = new ConcurrentHashMap<>();
        repo.findByCategoryOrderByDisplayOrder("smtp")
            .forEach(e -> kv.put(e.getKeyName(), e.getValue()));

        return MailConfig.builder()
            .enabled( Boolean.parseBoolean(kv.getOrDefault(KEY_ENABLED, String.valueOf(envEnabled))) )
            .host(    kv.getOrDefault(KEY_HOST,    envHost) )
            .port(    Integer.parseInt(kv.getOrDefault(KEY_PORT, String.valueOf(envPort))) )
            .username(kv.getOrDefault(KEY_USER,    envUsername) )
            .password(kv.getOrDefault(KEY_PASS,    envPassword) )
            .from(    kv.getOrDefault(KEY_FROM,    envFrom) )
            .build();
    }

    private void upsert(String key, String value) {
        if (value == null) return;
        repo.findByKeyName(key).ifPresentOrElse(
            e -> { e.setValue(value); repo.save(e); },
            () -> repo.save(ContactInfo.builder()
                .keyName(key).value(value).category("smtp")
                .displayOrder(0).active(true).build())
        );
    }
}
