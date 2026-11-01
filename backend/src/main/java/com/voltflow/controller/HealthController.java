package com.voltflow.controller;

import org.springframework.dao.DataAccessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/health")
public class HealthController {
  private static final Logger logger = LoggerFactory.getLogger(HealthController.class);
  private final JdbcTemplate jdbc;

  public HealthController(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping
  ResponseEntity<HealthResponse> health() {
    try {
      jdbc.queryForObject("SELECT 1", Integer.class);
      return ResponseEntity.ok(new HealthResponse("UP", "UP", Instant.now()));
    } catch (DataAccessException exception) {
      logger.warn("Health check could not reach the database", exception);
      return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(new HealthResponse("DOWN", "DOWN", Instant.now()));
    }
  }

  public record HealthResponse(String status, String database, Instant timestamp) {}
}
