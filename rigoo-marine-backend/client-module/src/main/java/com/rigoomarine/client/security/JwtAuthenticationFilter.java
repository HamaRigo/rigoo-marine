package com.rigoomarine.client.security;
import com.rigoomarine.common.security.AuthenticatedUser;
import com.rigoomarine.common.security.TokenRevocationCheck;

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

        String token = extractTokenFromRequest(request);

        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            io.jsonwebtoken.Claims claims = jwtTokenProvider.getClaims(token);

            // Task #6: invalidate tokens issued before the user changed their password.
            // pwdIat (epoch millis) is embedded by JwtTokenProvider on issue.
            Long pwdIat = claims.get("pwdIat", Long.class);
            Date iat = claims.getIssuedAt();
            if (pwdIat != null && iat != null && iat.getTime() < pwdIat) {
                filterChain.doFilter(request, response);
                return;
            }

            // Server-side revocation: if the jti is on the Redis blacklist (e.g.
            // user hit /api/auth/logout, or admin force-revoked), skip auth so
            // .anyRequest().authenticated() rejects with 401. Fails open if Redis
            // is unreachable — see TokenRevocationCheck.
            String jti = claims.getId();
            if (jti != null && revocationCheck.isRevoked(jti)) {
                filterChain.doFilter(request, response);
                return;
            }

            String email = claims.getSubject();
            List<String> roles = claims.get("roles", List.class);
            if (roles == null) {
                roles = List.of("ROLE_CLIENT");
            }

            List<SimpleGrantedAuthority> authorities = roles.stream()
                    .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
                    .map(SimpleGrantedAuthority::new)
                    .toList();

            Long clientId = claims.get("clientId", Long.class);
            AuthenticatedUser principal = new AuthenticatedUser(email, clientId,
                    roles.stream().map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r).toList());

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(principal, null, authorities);

            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        return null;
    }
}
