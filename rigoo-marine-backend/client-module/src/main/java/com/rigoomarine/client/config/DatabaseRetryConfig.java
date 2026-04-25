package com.rigoomarine.client.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

/**
 * Retry configuration for transient database failures.
 * Uses exponential backoff to avoid overwhelming the database during recovery.
 */
@Slf4j
@Configuration
@EnableRetry
public class DatabaseRetryConfig {

    /**
     * Retry template for database operations.
     * - Max 3 retries
     * - Initial delay: 1 second
     * - Multiplier: 2 (1s -> 2s -> 4s)
     * - Max delay: 10 seconds
     */
    @Bean
    public RetryTemplate databaseRetryTemplate() {
        RetryTemplate retryTemplate = new RetryTemplate();

        // Retry policy: max 3 attempts
        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(3);
        retryTemplate.setRetryPolicy(retryPolicy);

        // Backoff policy: exponential with jitter
        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(1000);      // 1 second
        backOffPolicy.setMultiplier(2.0);            // 1s -> 2s -> 4s
        backOffPolicy.setMaxInterval(10000);         // Max 10 seconds
        retryTemplate.setBackOffPolicy(backOffPolicy);

        return retryTemplate;
    }
}
