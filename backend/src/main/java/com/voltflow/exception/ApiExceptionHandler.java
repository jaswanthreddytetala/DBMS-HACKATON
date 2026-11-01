package com.voltflow.exception;

import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;

@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(NotFoundException.class)
  ResponseEntity<ApiError> notFound(NotFoundException exception) {
    return error(HttpStatus.NOT_FOUND, exception.getMessage());
  }

  @ExceptionHandler({
    IllegalArgumentException.class,
    IllegalStateException.class,
    HttpMessageNotReadableException.class,
    MissingServletRequestParameterException.class,
    MethodArgumentTypeMismatchException.class,
    ConstraintViolationException.class
  })
  ResponseEntity<ApiError> badRequest(Exception exception) {
    String message = exception instanceof HttpMessageNotReadableException
      ? "The request body is missing or invalid."
      : exception.getMessage();
    return error(HttpStatus.BAD_REQUEST, message);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> validation(MethodArgumentNotValidException exception) {
    Map<String, String> fieldErrors = new TreeMap<>();
    exception.getBindingResult().getFieldErrors().forEach(fieldError ->
      fieldErrors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage()));
    return ResponseEntity.badRequest().body(new ApiError(
      Instant.now(),
      HttpStatus.BAD_REQUEST.value(),
      HttpStatus.BAD_REQUEST.getReasonPhrase(),
      "One or more request fields are invalid.",
      fieldErrors
    ));
  }

  @ExceptionHandler(BadCredentialsException.class)
  ResponseEntity<ApiError> denied(BadCredentialsException exception) {
    return error(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> forbidden(AccessDeniedException exception) {
    return error(HttpStatus.FORBIDDEN, "You do not have permission to perform this action.");
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ApiError> conflict(DataIntegrityViolationException exception) {
    return error(HttpStatus.CONFLICT, "This change conflicts with existing records.");
  }

  @ExceptionHandler(ConflictException.class)
  ResponseEntity<ApiError> conflict(ConflictException exception) {
    return error(HttpStatus.CONFLICT, exception.getMessage());
  }

  @ExceptionHandler(NoResourceFoundException.class)
  ResponseEntity<ApiError> noResource(NoResourceFoundException exception) {
    return error(HttpStatus.NOT_FOUND, "The requested API resource was not found.");
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  ResponseEntity<ApiError> methodNotAllowed(HttpRequestMethodNotSupportedException exception) {
    return error(HttpStatus.METHOD_NOT_ALLOWED, "This HTTP method is not supported for the requested resource.");
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> unexpected(Exception exception) {
    logger.error("Unhandled API error", exception);
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected server error occurred.");
  }

  private ResponseEntity<ApiError> error(HttpStatus status, String message) {
    return ResponseEntity.status(status).body(new ApiError(
      Instant.now(),
      status.value(),
      status.getReasonPhrase(),
      message
    ));
  }
}
