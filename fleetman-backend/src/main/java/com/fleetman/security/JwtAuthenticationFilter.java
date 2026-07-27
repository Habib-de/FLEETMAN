package com.fleetman.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;
    
    private static final List<String> SKIP_PATHS = Arrays.asList(
        "/auth/login",
        "/auth/register", 
        "/auth/logout",
        "/auth/validate",
        "/public/**",
        "/tenants/register",
        "/ws/**"
    );
    
    private final AntPathMatcher pathMatcher = new AntPathMatcher();
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        
        String requestPath = request.getRequestURI();
        String method = request.getMethod();
        String authHeader = request.getHeader("Authorization");
        
        // DEBUG: Log every request
        log.info("🔍 JWT FILTER - Path: {} | Method: {} | AuthHeader: {}", requestPath, method, authHeader);
        log.info("🔍 SKIP_PATHS check for: {}", requestPath);
        
        // Skip JWT validation for public endpoints
        for (String path : SKIP_PATHS) {
            boolean matches = pathMatcher.match(path, requestPath);
            log.info("🔍 Checking {} against {} = {}", requestPath, path, matches);
            if (matches) {
                log.info("✅ SKIPPING JWT validation for: {}", requestPath);
                filterChain.doFilter(request, response);
                return;
            }
        }
        
        log.info("🔒 JWT validation required for: {}", requestPath);
        
        try {
            String jwt = getJwtFromRequest(request);
            log.info("🔍 JWT from request: {}", jwt != null ? "PRESENT" : "NULL/EMPTY");
            
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String email = tokenProvider.getUsernameFromToken(jwt);
                log.info("✅ JWT valid for user: {}", email);
                
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                UsernamePasswordAuthenticationToken authentication = 
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                
                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.info("✅ Authentication set for user: {}", email);
            } else {
                log.warn("❌ No valid JWT found for: {}", requestPath);
            }
        } catch (Exception ex) {
            log.error("❌ JWT processing error for {}: {}", requestPath, ex.getMessage(), ex);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}