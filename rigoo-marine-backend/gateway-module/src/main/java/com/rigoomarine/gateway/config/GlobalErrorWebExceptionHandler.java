package com.rigoomarine.gateway.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.support.NotFoundException;
import org.springframework.cloud.gateway.support.TimeoutException;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebExceptionHandler;
import reactor.core.publisher.Mono;

import java.net.ConnectException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Catch-all error handler for the API gateway. Guarantees that <em>every</em>
 * failure — including ones raised outside the {@code WebFilter} chain such as
 * routing errors, "no registered instance" ({@link NotFoundException} from a
 * {@code lb://} route when Eureka is down), and downstream connect/read
 * timeouts — is returned to the caller as a well-formed JSON HTTP response.
 *
 * <p><b>Why this exists.</b> Without an explicit handler, a routing failure can
 * surface to the browser as a dropped connection ({@code ERR_EMPTY_RESPONSE}):
 * the gateway never writes a response at all. A gateway must always answer with
 * a real status code. This handler also re-applies CORS headers on the error
 * response, so the SPA sees a genuine 503 instead of the browser masking it as
 * a CORS failure.
 *
 * <p>Registered at {@code @Order(-2)} so it takes precedence over Spring Boot's
 * default {@code errorWebExceptionHandler} (order {@code -1}). It handles every
 * exception, so the default never commits a response.
 *
 * <p>Note: this cannot help when the gateway <em>process itself</em> is dead or
 * OOM-thrashing — that is an infrastructure (memory) concern, not a code one.
 */
@Component
@Order(-2)
@Slf4j
public class GlobalErrorWebExceptionHandler implements WebExceptionHandler {

    private final ObjectMapper objectMapper;
    private final CorsConfigurationSource corsConfigurationSource;

    public GlobalErrorWebExceptionHandler(ObjectMapper objectMapper,
                                          CorsConfigurationSource corsConfigurationSource) {
        this.objectMapper = objectMapper;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Override
    @NonNull
    public Mono<Void> handle(@NonNull ServerWebExchange exchange, @NonNull Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();

        // If the response is already (partially) written we cannot rewrite it.
        // Propagate so the connection closes cleanly rather than corrupting the body.
        if (response.isCommitted()) {
            return Mono.error(ex);
        }

        HttpStatus status = resolveStatus(ex);
        String errorCode = resolveErrorCode(status);
        String path = exchange.getRequest().getPath().value();

        // 5xx is our fault — log with stack trace. 4xx is the caller's — log terse.
        if (status.is5xxServerError()) {
            log.error("gateway.error status={} path={} cause={}", status.value(), path, ex.toString(), ex);
        } else {
            log.warn("gateway.error status={} path={} cause={}", status.value(), path, ex.toString());
        }

        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        applyCorsHeaders(exchange);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("errorCode", errorCode);
        body.put("message", clientMessage(status));
        body.put("path", path);

        byte[] bytes;
        try {
            bytes = objectMapper.writeValueAsBytes(body);
        } catch (Exception serializationFailure) {
            // Never let the error handler itself throw — fall back to a literal.
            bytes = ("{\"errorCode\":\"" + errorCode + "\",\"message\":\""
                    + clientMessage(status) + "\"}").getBytes(StandardCharsets.UTF_8);
        }

        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer))
                .doOnError(writeFailure -> DataBufferUtils.release(buffer));
    }

    /**
     * Maps an exception to an HTTP status. A {@code lb://} route with no
     * resolvable instance (Eureka down, or the service not yet registered)
     * raises {@link NotFoundException} — a retryable 503, not a 404, because
     * the route exists; only the upstream is momentarily absent.
     */
    private HttpStatus resolveStatus(Throwable ex) {
        if (ex instanceof ResponseStatusException rse) {
            HttpStatus resolved = HttpStatus.resolve(rse.getStatusCode().value());
            return resolved != null ? resolved : HttpStatus.INTERNAL_SERVER_ERROR;
        }
        if (ex instanceof NotFoundException) {
            return HttpStatus.SERVICE_UNAVAILABLE;          // 503
        }
        if (ex instanceof TimeoutException || ex instanceof java.util.concurrent.TimeoutException) {
            return HttpStatus.GATEWAY_TIMEOUT;              // 504
        }
        if (hasCause(ex, ConnectException.class)) {
            return HttpStatus.SERVICE_UNAVAILABLE;          // 503 — downstream refused
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;            // 500
    }

    private String resolveErrorCode(HttpStatus status) {
        return switch (status) {
            case SERVICE_UNAVAILABLE -> "SERVICE_UNAVAILABLE";
            case GATEWAY_TIMEOUT     -> "UPSTREAM_TIMEOUT";
            case TOO_MANY_REQUESTS   -> "RATE_LIMITED";
            case NOT_FOUND           -> "NOT_FOUND";
            case UNAUTHORIZED        -> "UNAUTHORIZED";
            case FORBIDDEN           -> "FORBIDDEN";
            default                  -> status.is5xxServerError() ? "INTERNAL_ERROR" : "BAD_REQUEST";
        };
    }

    /** Caller-facing message — never leaks stack traces or internal hostnames. */
    private String clientMessage(HttpStatus status) {
        return switch (status) {
            case SERVICE_UNAVAILABLE -> "A required service is temporarily unavailable. Please try again in a moment.";
            case GATEWAY_TIMEOUT     -> "The request took too long to complete. Please try again.";
            case TOO_MANY_REQUESTS   -> "Too many requests. Please slow down and try again shortly.";
            default -> status.is5xxServerError()
                    ? "Something went wrong on our side. Please try again."
                    : status.getReasonPhrase();
        };
    }

    /**
     * Re-applies CORS headers on the error response. The {@code CorsWebFilter}
     * normally adds them on the success path; doing it again here is cheap and
     * idempotent, and guarantees the SPA can read the error body even if the
     * failure occurred before/around the CORS filter.
     */
    private void applyCorsHeaders(ServerWebExchange exchange) {
        String origin = exchange.getRequest().getHeaders().getOrigin();
        if (origin == null) {
            return;
        }
        CorsConfiguration config = corsConfigurationSource.getCorsConfiguration(exchange);
        if (config == null) {
            return;
        }
        String allowedOrigin = config.checkOrigin(origin);
        if (allowedOrigin == null) {
            return;   // origin not whitelisted — do not echo it back
        }
        HttpHeaders headers = exchange.getResponse().getHeaders();
        headers.setAccessControlAllowOrigin(allowedOrigin);
        if (Boolean.TRUE.equals(config.getAllowCredentials())) {
            headers.setAccessControlAllowCredentials(true);
        }
        headers.add(HttpHeaders.VARY, HttpHeaders.ORIGIN);
    }

    private static boolean hasCause(Throwable ex, Class<? extends Throwable> type) {
        for (Throwable t = ex; t != null && t != t.getCause(); t = t.getCause()) {
            if (type.isInstance(t)) {
                return true;
            }
        }
        return false;
    }
}
