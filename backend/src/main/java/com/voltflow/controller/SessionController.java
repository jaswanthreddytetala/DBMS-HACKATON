package com.voltflow.controller;

import com.voltflow.dto.BookingDtos.*;
import com.voltflow.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/sessions") @RequiredArgsConstructor
public class SessionController {
  private final SessionService service;

  @PostMapping("/start")
  ResponseEntity<SessionView> start(@Valid @RequestBody StartSession request, Authentication auth) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.start(request.bookingId(), auth.getName()));
  }

  @PostMapping("/{id}/stop")
  SessionView stop(@PathVariable Long id, @Valid @RequestBody StopSession request, Authentication auth) {
    return service.stop(id, request.energyKwh(), auth.getName());
  }

  @GetMapping
  List<SessionView> list(Authentication auth) {
    return service.list(auth.getName());
  }
}
