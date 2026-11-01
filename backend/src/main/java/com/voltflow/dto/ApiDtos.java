package com.voltflow.dto;

import com.voltflow.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public final class ApiDtos {
  private ApiDtos() {}

  public record ManagedUser(
    Long id,
    String fullName,
    String email,
    Role role,
    boolean enabled,
    Instant createdAt
  ) {}

  public record UpdateUserRequest(
    @NotBlank String fullName,
    @NotNull Role role,
    boolean enabled
  ) {}
}
