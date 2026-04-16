package com.rigoomarine.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class SecurityHeadersFilter implements GlobalFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        exchange.getResponse().getHeaders().add("X-Frame-Options", "DENY");
        exchange.getResponse().getHeaders().add("X-Content-Type-Options", "nosniff");
        exchange.getResponse().getHeaders().add("X-XSS-Protection", "1; mode=block");
        exchange.getResponse().getHeaders().add("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        exchange.getResponse().getHeaders().add("Referrer-Policy", "strict-origin-when-cross-origin");
        exchange.getResponse().getHeaders().add("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

        // Content Security Policy
        exchange.getResponse().getHeaders().add("Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self'; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none';");

        return chain.filter(exchange);
    }
}
