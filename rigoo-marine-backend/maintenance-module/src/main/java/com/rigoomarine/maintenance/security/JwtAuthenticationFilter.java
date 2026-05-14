package com.rigoomarine.maintenance.security;

import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.common.security.TokenRevocationCheck;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Date;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenRevocationCheck revocationCheck;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String token = extractToken(request);
        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            Claims claims = jwtTokenProvider.getClaims(token);

            Long pwdIat = claims.get("pwdIat", Long.class);
            Date iat = claims.getIssuedAt();
            if (pwdIat != null && iat != null && iat.getTime() < pwdIat) {
                filterChain.doFilter(request, response);
                return;
            }

            String jti = claims.getId();
            if (jti != null && revocationCheck.isRevoked(jti)) {
                filterChain.doFilter(request, response);
                return;
            }

            String email = claims.getSubject();
            @SuppressWarnings("unchecked")
            List<String> roles = claims.get("roles", List.class);
            if (roles == null) roles = List.of("ROLE_CLIENT");

            List<String> normalised = roles.stream()
                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                .toList();
            List<SimpleGrantedAuthority> authorities = normalised.stream()
                .map(SimpleGrantedAuthority::new)
                .toList();

            Long clientId = claims.get("clientId", Long.class);
            AuthenticatedUser principal = new AuthenticatedUser(email, clientId, normalised);

            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, authorities);
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
