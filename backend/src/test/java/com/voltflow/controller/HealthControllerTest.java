package com.voltflow.controller;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HealthControllerTest {
  @Test
  void reportsApiAndDatabaseHealthy() {
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    when(jdbc.queryForObject("SELECT 1", Integer.class)).thenReturn(1);

    var response = new HealthController(jdbc).health();

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals("UP", response.getBody().status());
    assertEquals("UP", response.getBody().database());
  }

  @Test
  void reportsDatabaseUnavailableWithoutThrowing() {
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    when(jdbc.queryForObject("SELECT 1", Integer.class))
      .thenThrow(new DataAccessResourceFailureException("database credentials must not be returned"));

    var response = new HealthController(jdbc).health();

    assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
    assertEquals("DOWN", response.getBody().status());
    assertEquals("DOWN", response.getBody().database());
  }
}
