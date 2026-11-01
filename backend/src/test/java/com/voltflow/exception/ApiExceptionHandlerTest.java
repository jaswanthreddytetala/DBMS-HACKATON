package com.voltflow.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApiExceptionHandlerTest {
  private final ApiExceptionHandler handler = new ApiExceptionHandler();

  @Test
  void validationErrorsReturnBadRequest() {
    var response = handler.badRequest(new IllegalStateException("Charger is unavailable"));

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    assertEquals("Charger is unavailable", response.getBody().message());
    assertEquals(400, response.getBody().status());
  }

  @Test
  void databaseConstraintErrorsDoNotExposeDatabaseDetails() {
    var response = handler.conflict(new DataIntegrityViolationException("database constraint detail"));

    assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    assertEquals("This change conflicts with existing records.", response.getBody().message());
    assertEquals(409, response.getBody().status());
  }
}
