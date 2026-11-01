package com.voltflow.controller;

import com.voltflow.dto.ApiDtos.UpdateUserRequest;
import com.voltflow.dto.ApiDtos.ManagedUser;
import com.voltflow.entity.User;
import com.voltflow.exception.NotFoundException;
import com.voltflow.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
  private final UserRepository users;

  @GetMapping
  List<ManagedUser> list() {
    return users.findAll().stream().map(UserController::toManagedUser).toList();
  }

  @PutMapping("/{id}")
  ManagedUser update(
    @PathVariable Long id,
    @Valid @RequestBody UpdateUserRequest request,
    Authentication authentication
  ) {
    User user = findUser(id);
    boolean editingOwnAccount = user.getEmail().equals(authentication.getName());
    if (editingOwnAccount && (!request.enabled() || request.role() != user.getRole())) {
      throw new AccessDeniedException("Administrators cannot disable or change their own role.");
    }

    user.setFullName(request.fullName().trim());
    user.setRole(request.role());
    user.setEnabled(request.enabled());
    return toManagedUser(users.save(user));
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(@PathVariable Long id, Authentication authentication) {
    User user = findUser(id);
    if (user.getEmail().equals(authentication.getName())) {
      throw new AccessDeniedException("Administrators cannot delete their own account.");
    }
    users.delete(user);
  }

  private User findUser(Long id) {
    return users.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
  }

  private static ManagedUser toManagedUser(User user) {
    return new ManagedUser(user.getId(), user.getFullName(), user.getEmail(), user.getRole(), user.isEnabled(), user.getCreatedAt());
  }
}
