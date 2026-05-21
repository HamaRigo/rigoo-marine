package com.rigoomarine.client.config;

import io.lettuce.core.ClientOptions;
import io.lettuce.core.SocketOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

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
public class RedisConfig {

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
}
