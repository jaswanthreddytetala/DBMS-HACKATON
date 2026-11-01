package com.voltflow.security;

import com.voltflow.entity.User;
import com.voltflow.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {
  private final JwtService jwt;
  private final UserRepository users;

  @Override
  protected void doFilterInternal(
    HttpServletRequest request,
    HttpServletResponse response,
    FilterChain chain
  ) throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (
      header != null
        && header.startsWith("Bearer ")
        && SecurityContextHolder.getContext().getAuthentication() == null
    ) {
      try {
        String email = jwt.subject(header.substring(7));
        users.findByEmail(email)
          .filter(User::isEnabled)
          .ifPresent(user -> SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(
              email,
              null,
              List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
            )
          ));
      } catch (JwtException | IllegalArgumentException ignored) {
        // Protected routes reject requests that do not establish authentication.
      }
    }
    chain.doFilter(request, response);
  }
}
