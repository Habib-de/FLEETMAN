package com.fleetman.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {
    
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        log.info("🔧 SecurityConfig initializing...");
        
        http
            .cors().configurationSource(corsConfigurationSource())
            .and()
            .csrf().disable()
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .authorizeRequests()
                // ⭐ PUBLIC ENDPOINTS
                .antMatchers("/auth/**").permitAll()
                .antMatchers("/auth/login").permitAll()
                .antMatchers("/auth/register").permitAll()
                .antMatchers("/auth/logout").permitAll()
                .antMatchers("/auth/validate").permitAll()
                .antMatchers("/public/**").permitAll()
                .antMatchers("/tenants/register").permitAll()
                .antMatchers("/ws/**").permitAll()
                .antMatchers("/swagger-ui/**", "/v2/api-docs/**", "/swagger-resources/**").permitAll()
                .antMatchers("/demo/**").permitAll()
                
                // ⭐ PROTECTED ENDPOINTS - FIXED!
                .antMatchers("/tenants/**").hasAnyRole("super_admin", "car_owner", "driver")  // ✅ ADD 'driver'  // ← CHANGED!
                .antMatchers("/users/**").hasAnyRole("super_admin", "car_owner", "driver")  // ✅ ADD 'driver'  // ← CHANGED!
                .antMatchers("/vehicles/**").hasAnyRole("super_admin", "car_owner", "driver")
                .antMatchers("/drivers/**").hasAnyRole("super_admin", "car_owner", "driver")
                .antMatchers("/trips/**").hasAnyRole("super_admin", "car_owner", "driver")
                .antMatchers("/maintenance/**").hasAnyRole("super_admin", "car_owner", "driver")
                .antMatchers("/fuel/**").hasAnyRole("super_admin", "car_owner", "driver")
                .antMatchers("/reports/**").hasAnyRole("super_admin", "car_owner")
                .anyRequest().authenticated()
            .and()
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        log.info("🔧 SecurityConfig initialized successfully");
        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        log.info("🔧 CORS configuration initializing...");
        
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Disposition"));
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        source.registerCorsConfiguration("/ws/**", configuration);        
        source.registerCorsConfiguration("/ws/raw/**", configuration);   
        source.registerCorsConfiguration("/ws/info/**", configuration);  
        
        log.info("🔧 CORS configuration initialized");
        return source;
    }
}