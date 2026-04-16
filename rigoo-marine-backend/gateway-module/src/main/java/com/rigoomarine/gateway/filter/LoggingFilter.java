package com.rigoomarine.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class LoggingFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(LoggingFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = exchange.getRequest().getHeaders().getFirst("X-Correlation-ID");
        String method = exchange.getRequest().getMethod().name();
        String path = exchange.getRequest().getPath().value();
        String clientIp = exchange.getRequest().getHeaders().getFirst("X-Client-IP");

        log.info("Request: correlationId={}, method={}, path={}, clientIp={}",
                correlationId, method, path, clientIp);

        long startTime = System.currentTimeMillis();

        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            long duration = System.currentTimeMillis() - startTime;
            int statusCode = exchange.getResponse().getStatusCode() != null ?
                           exchange.getResponse().getStatusCode().value() : 0;

            log.info("Response: correlationId={}, status={}, duration={}ms",
                    correlationId, statusCode, duration);
        }));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 1; // Execute early but after request transformation
    }
}
