package com.voltflow.controller;

import com.voltflow.dto.BookingDtos.*;
import com.voltflow.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/bookings") @RequiredArgsConstructor
public class BookingController {
  private final BookingService service;

  @PostMapping
  ResponseEntity<BookingView> create(@Valid @RequestBody CreateBooking request, Authentication auth) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request.chargerId(), request.scheduledAt(), auth.getName()));
  }

  @GetMapping
  List<BookingView> list(Authentication auth) {
    return service.list(auth.getName());
  }

  @PutMapping("/{id}/cancel")
  BookingView cancel(@PathVariable Long id, Authentication auth) {
    return service.cancel(id, auth.getName());
  }
}
