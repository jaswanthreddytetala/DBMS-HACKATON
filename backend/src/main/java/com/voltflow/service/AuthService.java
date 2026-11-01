package com.voltflow.service;

import com.voltflow.dto.AuthDtos.AuthResponse;
import com.voltflow.dto.AuthDtos.LoginRequest;
import com.voltflow.dto.AuthDtos.ProfileResponse;
import com.voltflow.dto.AuthDtos.RegisterRequest;
import com.voltflow.entity.Role;
import com.voltflow.entity.User;
import com.voltflow.exception.ConflictException;
import com.voltflow.exception.NotFoundException;
import com.voltflow.repository.UserRepository;
import com.voltflow.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    String email = request.email().trim().toLowerCase();
    if (users.existsByEmail(email)) {
      throw new ConflictException("Email is already registered.");
    }

    User user = new User();
    user.setFullName(request.fullName().trim());
    user.setEmail(email);
    user.setPasswordHash(encoder.encode(request.password()));
    user.setRole(Role.DRIVER);
    users.save(user);
    return response(user);
  }

  public AuthResponse login(LoginRequest request) {
    String email = request.email().trim().toLowerCase();
    User user = users.findByEmail(email)
      .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
    if (!user.isEnabled() || !encoder.matches(request.password(), user.getPasswordHash())) {
      throw new BadCredentialsException("Invalid credentials");
    }
    return response(user);
  }

  @Transactional(readOnly = true)
  public ProfileResponse profile(String email) {
    User user = users.findByEmail(email)
      .filter(User::isEnabled)
      .orElseThrow(() -> new NotFoundException("User not found"));
    return new ProfileResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
  }

  private AuthResponse response(User user) {
    return new AuthResponse(
      jwt.issue(user.getEmail(), user.getRole().name()),
      user.getId(),
      user.getFullName(),
      user.getEmail(),
      user.getRole()
    );
  }
}
