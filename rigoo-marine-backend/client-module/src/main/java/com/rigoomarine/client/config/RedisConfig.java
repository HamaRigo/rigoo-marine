package com.rigoomarine.client.config;

import io.lettuce.core.ClientOptions;
import io.lettuce.core.SocketOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.lang.NonNull;

import java.time.Duration;

/**
 * Redis connection and cache configuration.
 *
 * Key invariant: Redis is a caching layer only. A connection failure must never
 * prevent the service from starting or serving core API traffic. Lettuce is
 * configured with a short connect-timeout so a missing Redis does not stall startup,
 * and the CacheManager falls back to a no-op if the factory is unhealthy.
 */
@Slf4j
@Configuration
public class RedisConfig implements CachingConfigurer {

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${spring.data.redis.database:1}")
    private int redisDatabase;

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        SocketOptions socketOptions = SocketOptions.builder()
            // Fail fast rather than blocking the Spring context for 30s.
            .connectTimeout(Duration.ofSeconds(2))
            .build();

        ClientOptions clientOptions = ClientOptions.builder()
            .socketOptions(socketOptions)
            // Let commands queue while reconnecting rather than throwing immediately.
            // Keeps cache reads non-fatal after a brief Redis blip.
            .disconnectedBehavior(ClientOptions.DisconnectedBehavior.ACCEPT_COMMANDS)
            .build();

        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
            .clientOptions(clientOptions)
            .commandTimeout(Duration.ofSeconds(2))
            .build();

        RedisStandaloneConfiguration serverConfig =
            new RedisStandaloneConfiguration(redisHost, redisPort);
        serverConfig.setDatabase(redisDatabase);

        return new LettuceConnectionFactory(serverConfig, clientConfig);
    }

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer() {
        return builder -> builder.cacheDefaults(
            RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .disableCachingNullValues()
        );
    }

    /**
     * Swallow Redis failures so a cache outage degrades gracefully (cache miss →
     * DB read) rather than returning 500 to the caller. The default
     * SimpleCacheErrorHandler rethrows, which turns a Redis timeout during
     * @CacheEvict on register/createClient into an HTTP 500.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(@NonNull RuntimeException ex, @NonNull Cache cache, @NonNull Object key) {
                log.warn("cache.get_error cache={} key={} cause={}", cache.getName(), key, ex.toString());
            }
            @Override
            public void handleCachePutError(@NonNull RuntimeException ex, @NonNull Cache cache, @NonNull Object key, Object value) {
                log.warn("cache.put_error cache={} key={} cause={}", cache.getName(), key, ex.toString());
            }
            @Override
            public void handleCacheEvictError(@NonNull RuntimeException ex, @NonNull Cache cache, @NonNull Object key) {
                log.warn("cache.evict_error cache={} key={} cause={}", cache.getName(), key, ex.toString());
            }
            @Override
            public void handleCacheClearError(@NonNull RuntimeException ex, @NonNull Cache cache) {
                log.warn("cache.clear_error cache={} cause={}", cache.getName(), ex.toString());
            }
        };
    }
}
