package com.voltflow.exception;

import java.time.Instant;
import java.util.Map;

public record ApiError(
  Instant timestamp,
  int status,
  String error,
  String message,
  Map<String, String> fieldErrors
) {
  public ApiError(Instant timestamp, int status, String error, String message) {
    this(timestamp, status, error, message, Map.of());
  }
}
