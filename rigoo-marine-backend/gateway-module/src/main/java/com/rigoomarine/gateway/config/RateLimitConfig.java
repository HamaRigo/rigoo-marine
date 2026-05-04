package com.rigoomarine.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimitConfig {

    @Bean
    @Primary
    public KeyResolver userKeyResolver() {
        return exchange -> {
            String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                return Mono.just("user:" + authHeader.substring(7));
            }
            return Mono.just(ipKey(exchange));
        };
    }

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just(ipKey(exchange));
    }

    private String ipKey(ServerWebExchange exchange) {
        var addr = exchange.getRequest().getRemoteAddress();
        if (addr != null && addr.getAddress() != null) {
            return "ip:" + addr.getAddress().getHostAddress();
        }
        return "ip:unknown";
    }
}
