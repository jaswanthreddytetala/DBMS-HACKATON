package com.voltflow.service;

import com.voltflow.dto.AuthDtos.AuthResponse;
import com.voltflow.dto.AuthDtos.LoginRequest;
import com.voltflow.dto.AuthDtos.RegisterRequest;
import com.voltflow.entity.Role;
import com.voltflow.entity.User;
import com.voltflow.repository.UserRepository;
import com.voltflow.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
  @Mock private UserRepository users;
  @Mock private PasswordEncoder encoder;
  @Mock private JwtService jwt;
  @InjectMocks private AuthService service;

  @Test
  void registrationAlwaysCreatesDriverAndIssuesToken() {
    when(users.existsByEmail("new.driver@example.com")).thenReturn(false);
    when(encoder.encode("password123")).thenReturn("encoded-password");
    when(users.save(any(User.class))).thenAnswer(invocation -> {
      User user = invocation.getArgument(0);
      user.setId(17L);
      return user;
    });
    when(jwt.issue("new.driver@example.com", "DRIVER")).thenReturn("signed-jwt");

    AuthResponse response = service.register(new RegisterRequest(
      "New Driver",
      "New.Driver@example.com",
      "password123"
    ));

    assertEquals("signed-jwt", response.token());
    assertEquals(17L, response.userId());
    assertEquals(Role.DRIVER, response.role());

    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
    verify(users).save(userCaptor.capture());
    assertEquals("new.driver@example.com", userCaptor.getValue().getEmail());
    assertEquals(Role.DRIVER, userCaptor.getValue().getRole());
  }

  @Test
  void disabledUserCannotLogIn() {
    User disabledUser = new User();
    disabledUser.setEmail("disabled@example.com");
    disabledUser.setPasswordHash("encoded-password");
    disabledUser.setEnabled(false);
    when(users.findByEmail("disabled@example.com")).thenReturn(Optional.of(disabledUser));

    assertThrows(
      BadCredentialsException.class,
      () -> service.login(new LoginRequest("disabled@example.com", "password123"))
    );
  }
}
