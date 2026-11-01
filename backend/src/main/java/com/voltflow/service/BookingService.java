package com.voltflow.service;

import com.voltflow.dto.BookingDtos.BookingView;
import com.voltflow.entity.*;
import com.voltflow.exception.NotFoundException;
import com.voltflow.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;

@Service @RequiredArgsConstructor
public class BookingService {
  private final BookingRepository bookings;
  private final ChargerRepository chargers;
  private final UserRepository users;

  @Transactional
  public BookingView create(Long chargerId, Instant at, String email) {
    Charger charger = chargers.findById(chargerId).orElseThrow(() -> new NotFoundException("Charger not found"));
    if (charger.getStatus() != ChargerStatus.AVAILABLE) throw new IllegalStateException("Charger is unavailable");
    User driver = users.findByEmail(email).orElseThrow(() -> new NotFoundException("User not found"));
    Booking booking = new Booking();
    booking.setCharger(charger);
    booking.setDriver(driver);
    booking.setScheduledAt(at);
    return toView(bookings.save(booking));
  }

  @Transactional(readOnly = true)
  public List<BookingView> list(String email) {
    return bookings.findByDriverEmailOrderByScheduledAtDesc(email).stream().map(this::toView).toList();
  }

  @Transactional
  public BookingView cancel(Long id, String email) {
    Booking booking = bookings.findById(id).orElseThrow(() -> new NotFoundException("Booking not found"));
    if (!booking.getDriver().getEmail().equals(email)) throw new NotFoundException("Booking not found");
    if (booking.getStatus() != SessionStatus.BOOKED) throw new IllegalStateException("Only booked sessions can be cancelled");
    booking.setStatus(SessionStatus.CANCELLED);
    return toView(booking);
  }

  private BookingView toView(Booking booking) {
    Charger charger = booking.getCharger();
    return new BookingView(booking.getId(), charger.getId(), charger.getCode(), charger.getStation().getName(), booking.getScheduledAt(), booking.getStatus());
  }
}
