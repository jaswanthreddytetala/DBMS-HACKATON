package com.voltflow.dto;

import com.voltflow.entity.SessionStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.Instant;

public final class BookingDtos {
  private BookingDtos() {}

  public record CreateBooking(@NotNull Long chargerId, @NotNull Instant scheduledAt) {}
  public record StartSession(@NotNull Long bookingId) {}
  public record StopSession(@NotNull @PositiveOrZero BigDecimal energyKwh) {}
  public record BookingView(Long id, Long chargerId, String chargerCode, String stationName, Instant scheduledAt, SessionStatus status) {}
  public record SessionView(Long id, Long bookingId, Long chargerId, String chargerCode, String stationName, Instant startedAt, Instant endedAt, BigDecimal energyKwh, BigDecimal totalCost, SessionStatus status) {}
}
