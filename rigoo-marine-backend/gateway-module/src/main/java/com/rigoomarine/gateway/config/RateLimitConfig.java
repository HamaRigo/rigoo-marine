package com.rigoomarine.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimitConfig {

    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            // Extract user ID from JWT token or Authorization header
            String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                // In a real implementation, you'd decode the JWT to get user ID
                // For now, we'll use a simple approach
                return Mono.just("user:" + authHeader.substring(7));
            }
            // Fallback to IP if no auth header
            return Mono.just("anonymous");
        };
    }

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just("ip");
    }
}
