package com.voltflow.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtServiceTest {
  private final JwtService jwt = new JwtService(
    "voltflow-test-secret-key-that-is-at-least-32-bytes",
    60_000
  );

  @Test
  void issuedTokenCanBeVerifiedAndRead() {
    String token = jwt.issue("driver@example.com", "DRIVER");

    assertEquals("driver@example.com", jwt.subject(token));
    assertEquals(
      "DRIVER",
      Jwts.parser()
        .verifyWith(Keys.hmacShaKeyFor(
          "voltflow-test-secret-key-that-is-at-least-32-bytes".getBytes(StandardCharsets.UTF_8)
        ))
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .get("role", String.class)
    );
  }

  @Test
  void malformedTokenIsRejected() {
    assertThrows(JwtException.class, () -> jwt.subject("not.a.jwt"));
  }

  @Test
  void weakSecretIsRejected() {
    assertThrows(IllegalArgumentException.class, () -> new JwtService("too-short", 60_000));
  }

  @Test
  void nonPositiveExpirationIsRejected() {
    assertThrows(
      IllegalArgumentException.class,
      () -> new JwtService("voltflow-test-secret-key-that-is-at-least-32-bytes", 0)
    );
  }

  @Test
  void unknownRoleIsRejectedWhenIssuingToken() {
    assertThrows(
      IllegalArgumentException.class,
      () -> jwt.issue("driver@example.com", "SUPERUSER")
    );
  }
}
