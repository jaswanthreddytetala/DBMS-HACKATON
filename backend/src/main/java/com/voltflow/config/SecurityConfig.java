package com.voltflow.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.voltflow.exception.ApiError;
import com.voltflow.security.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import java.time.Instant;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
  private final JwtFilter jwtFilter;
  private final ObjectMapper objectMapper;

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http
      .csrf(csrf -> csrf.disable())
      .cors(cors -> {})
      .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .exceptionHandling(errors -> errors
        .authenticationEntryPoint((request, response, exception) -> {
          response.setStatus(HttpStatus.UNAUTHORIZED.value());
          response.setContentType("application/json");
          objectMapper.writeValue(response.getOutputStream(), new ApiError(
            Instant.now(),
            HttpStatus.UNAUTHORIZED.value(),
            HttpStatus.UNAUTHORIZED.getReasonPhrase(),
            "A valid Bearer token is required."
          ));
        })
        .accessDeniedHandler((request, response, exception) -> {
          response.setStatus(HttpStatus.FORBIDDEN.value());
          response.setContentType("application/json");
          objectMapper.writeValue(response.getOutputStream(), new ApiError(
            Instant.now(),
            HttpStatus.FORBIDDEN.value(),
            HttpStatus.FORBIDDEN.getReasonPhrase(),
            "You do not have permission to perform this action."
          ));
        }))
      .authorizeHttpRequests(authorize -> authorize
        .requestMatchers("/api/auth/**").permitAll()
        .requestMatchers("/api/health").permitAll()
        .requestMatchers("/api/users/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.GET, "/api/stations", "/api/stations/**").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/chargers", "/api/chargers/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/stations/**").hasAnyRole("ADMIN", "OPERATOR")
        .requestMatchers(HttpMethod.PUT, "/api/stations/**").hasAnyRole("ADMIN", "OPERATOR")
        .requestMatchers(HttpMethod.DELETE, "/api/stations/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.POST, "/api/chargers/**").hasAnyRole("ADMIN", "OPERATOR")
        .requestMatchers(HttpMethod.PUT, "/api/chargers/**").hasAnyRole("ADMIN", "OPERATOR")
        .requestMatchers("/api/bookings/**", "/api/sessions/**").hasRole("DRIVER")
        .requestMatchers("/api/analytics/**").hasAnyRole("ADMIN", "OPERATOR")
        .anyRequest().authenticated())
      .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
      .build();
  }

  @Bean
  CorsConfigurationSource cors(@Value("${app.cors-origin}") String origin) {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of(
      origin,
      "http://localhost:8443",
      "http://127.0.0.1:8443",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", configuration);
    return source;
  }
}
