package com.rigoomarine.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class ResponseTransformationFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = exchange.getRequest().getHeaders().getFirst("X-Correlation-ID");
        String requestTimestamp = exchange.getRequest().getHeaders().getFirst("X-Request-Timestamp");

        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            ServerHttpResponse response = exchange.getResponse();

            // Add response headers
            if (correlationId != null) {
                response.getHeaders().add("X-Correlation-ID", correlationId);
            }

            if (requestTimestamp != null) {
                long requestTime = Long.parseLong(requestTimestamp);
                long responseTime = System.currentTimeMillis();
                long processingTime = responseTime - requestTime;
                response.getHeaders().add("X-Processing-Time", String.valueOf(processingTime) + "ms");
            }

            // Add standard response headers
            response.getHeaders().add("X-API-Version", "1.0");
            response.getHeaders().add("X-Powered-By", "Rigoo Marine API Gateway");
        }));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE; // Execute after other filters
    }
}
