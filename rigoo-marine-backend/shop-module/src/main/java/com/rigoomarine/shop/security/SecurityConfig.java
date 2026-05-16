package com.rigoomarine.shop.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            // CORS is owned solely by the api-gateway; this service receives
            // only server-to-server traffic and must not re-run CORS.
            .cors(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // Public catalog browsing
                .requestMatchers(HttpMethod.GET, "/api/products", "/api/products/*", "/api/products/by-slug/*").permitAll()
                // Inquiry submission is open (guests can inquire). Admin endpoints below
                // are guarded by @PreAuthorize.
                .requestMatchers(HttpMethod.POST, "/api/products/inquiries").permitAll()
                // Internal callbacks (invoice-module webhook → shop) — token-authenticated at controller level,
                // not via JWT. SecurityConfig permits them; the controller checks X-Internal-Api-Token.
                .requestMatchers("/api/internal/**").permitAll()
                // Cart + orders — auth required (login-gated checkout per locked decision).
                .requestMatchers("/api/cart/**", "/api/orders/**").authenticated()
                // Admin order inbox — @PreAuthorize on the controller handles ADMIN role.
                .requestMatchers("/api/admin/**").authenticated()
                .anyRequest().authenticated()
            )
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
