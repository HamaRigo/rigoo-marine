package com.rigoomarine.invoice.security;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
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
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/api/payments/webhooks/stripe").permitAll()
                .requestMatchers(HttpMethod.GET).authenticated()
                .requestMatchers(HttpMethod.POST, "/api/invoices").hasAnyRole("ADMIN", "TEAM_LEAD")
                .requestMatchers(HttpMethod.PUT, "/api/invoices/**").hasAnyRole("ADMIN", "TEAM_LEAD")
                .requestMatchers(HttpMethod.DELETE, "/api/invoices/**").hasAnyRole("ADMIN", "TEAM_LEAD")
                .anyRequest().authenticated()
            )
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Prevent @Component on JwtAuthenticationFilter from double-registering it
    // as a raw servlet filter (Spring Boot auto-registers @Component filters).
    // Without this, the filter runs twice: once before and once inside the
    // Security filter chain, and OncePerRequestFilter skips the second run.
    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(
            JwtAuthenticationFilter filter) {
        FilterRegistrationBean<JwtAuthenticationFilter> reg = new FilterRegistrationBean<>(filter);
        reg.setEnabled(false);
        return reg;
    }
}
