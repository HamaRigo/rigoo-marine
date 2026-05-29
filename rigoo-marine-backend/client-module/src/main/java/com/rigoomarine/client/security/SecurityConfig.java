package com.rigoomarine.client.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.servlet.http.HttpServletResponse;
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
                // Public endpoints
                .requestMatchers(
                    // Uploaded files are public (gallery images, avatars, etc.)
                    "/uploads/**",
                    // Public auth endpoints (no JWT required)
                    "/api/auth/register",
                    "/api/auth/login",
                    "/api/auth/otp/**",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password",
                    "/api/auth/verify-email",
                    "/api/auth/resend-verification",
                    // Public read-only data (footer contact info, etc.) — no auth.
                    "/api/public/**",
                    // Team requests are open to guests (no JWT required).
                    // Auth is optional: if a JWT is present it's read for clientId.
                    "/api/team-requests",
                    // Email unsubscribe page + POST — token-authenticated at
                    // the controller, NOT JWT-gated (clicking from email).
                    "/unsubscribe",
                    "/actuator/health",
                    "/actuator/info"
                ).permitAll()
                // Admin endpoints
                .requestMatchers("/admin/**").hasRole("ADMIN")
                // Technician endpoints
                .requestMatchers("/technician/**").hasAnyRole("TECHNICIAN", "TEAM_LEAD", "ADMIN")
                // Team lead endpoints
                .requestMatchers("/team-lead/**").hasAnyRole("TEAM_LEAD", "ADMIN")
                // Delivery endpoints
                .requestMatchers("/delivery/**", "/api/delivery/**").hasAnyRole("DELIVERY", "TEAM_LEAD", "ADMIN")
                // All authenticated requests
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, e) ->
                    res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized"))
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }
}
