package com.voltflow.dto;
import com.voltflow.entity.Role; import jakarta.validation.constraints.*;
public final class AuthDtos {
  private AuthDtos(){}
  public record RegisterRequest(@NotBlank String fullName,@Email @NotBlank String email,@NotBlank @Size(min=8) String password){}
  public record LoginRequest(@Email @NotBlank String email,@NotBlank String password){}
  public record AuthResponse(String token,Long userId,String fullName,String email,Role role){}
  public record ProfileResponse(Long userId,String fullName,String email,Role role){}
}
