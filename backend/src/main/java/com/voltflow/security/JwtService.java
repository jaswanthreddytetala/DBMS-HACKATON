package com.voltflow.security;

import com.voltflow.entity.Role;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {
  private final SecretKey key;
  private final long expiration;

  public JwtService(
    @Value("${app.jwt.secret}") String secret,
    @Value("${app.jwt.expiration-ms}") long expiration
  ) {
    if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
      throw new IllegalArgumentException("JWT secret must be at least 32 bytes");
    }
    if (expiration <= 0) {
      throw new IllegalArgumentException("JWT expiration must be positive");
    }

    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expiration = expiration;
  }

  public String issue(String email, String role) {
    if (role == null) {
      throw new IllegalArgumentException("JWT role is required");
    }
    try {
      Role.valueOf(role);
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("Unsupported JWT role: " + role, exception);
    }

    return Jwts.builder()
      .subject(email)
      .claim("role", role)
      .issuedAt(new Date())
      .expiration(new Date(System.currentTimeMillis() + expiration))
      .signWith(key)
      .compact();
  }

  public String subject(String token) {
    return Jwts.parser()
      .verifyWith(key)
      .build()
      .parseSignedClaims(token)
      .getPayload()
      .getSubject();
  }
}
