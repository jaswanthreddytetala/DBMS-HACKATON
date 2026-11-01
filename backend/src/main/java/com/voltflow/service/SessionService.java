package com.voltflow.service;

import com.voltflow.dto.BookingDtos.SessionView;
import com.voltflow.entity.*;
import com.voltflow.exception.NotFoundException;
import com.voltflow.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service @RequiredArgsConstructor
public class SessionService {
  private final SessionRepository sessions;
  private final BookingRepository bookings;
  private final PaymentRepository payments;

  @Transactional
  public SessionView start(Long bookingId, String email) {
    Booking booking = bookings.findById(bookingId).orElseThrow(() -> new NotFoundException("Booking not found"));
    if (!booking.getDriver().getEmail().equals(email)) throw new NotFoundException("Booking not found");
    if (booking.getStatus() != SessionStatus.BOOKED) throw new IllegalStateException("Booking cannot be started");
    booking.setStatus(SessionStatus.CHARGING);
    booking.getCharger().setStatus(ChargerStatus.OCCUPIED);
    ChargingSession session = new ChargingSession();
    session.setBooking(booking);
    session.setDriver(booking.getDriver());
    session.setCharger(booking.getCharger());
    session.setStartedAt(Instant.now());
    return toView(sessions.save(session));
  }

  @Transactional
  public SessionView stop(Long id, BigDecimal energy, String email) {
    ChargingSession session = sessions.findById(id).orElseThrow(() -> new NotFoundException("Session not found"));
    if (!session.getDriver().getEmail().equals(email)) throw new NotFoundException("Session not found");
    if (session.getStatus() != SessionStatus.CHARGING) throw new IllegalStateException("Session is not active");
    session.setEnergyKwh(energy);
    session.setTotalCost(energy.multiply(session.getCharger().getStation().getPricePerKwh()).setScale(2, RoundingMode.HALF_UP));
    session.setEndedAt(Instant.now());
    session.setStatus(SessionStatus.COMPLETED);
    session.getBooking().setStatus(SessionStatus.COMPLETED);
    session.getCharger().setStatus(ChargerStatus.AVAILABLE);

    Payment payment = new Payment();
    payment.setSession(session);
    payment.setAmount(session.getTotalCost());
    payment.setStatus("COMPLETED");
    payments.save(payment);
    return toView(session);
  }

  @Transactional(readOnly = true)
  public List<SessionView> list(String email) {
    return sessions.findByDriverEmailOrderByStartedAtDesc(email).stream().map(this::toView).toList();
  }

  @Transactional(readOnly = true)
  public List<SessionView> listAll() {
    return sessions.findAllByOrderByStartedAtDesc().stream().map(this::toView).toList();
  }

  private SessionView toView(ChargingSession session) {
    Charger charger = session.getCharger();
    return new SessionView(
      session.getId(),
      session.getBooking() == null ? null : session.getBooking().getId(),
      charger.getId(),
      charger.getCode(),
      charger.getStation().getName(),
      session.getStartedAt(),
      session.getEndedAt(),
      session.getEnergyKwh(),
      session.getTotalCost(),
      session.getStatus()
    );
  }
}
