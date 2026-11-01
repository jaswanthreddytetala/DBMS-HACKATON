package com.voltflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name="bookings", indexes={@Index(name="idx_booking_driver",columnList="driver_id"),@Index(name="idx_booking_start",columnList="scheduled_at")})
@Getter @Setter @NoArgsConstructor
public class Booking {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="driver_id") private User driver;
  @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="charger_id") private Charger charger;
  @Column(nullable=false) private Instant scheduledAt;
  @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private SessionStatus status = SessionStatus.BOOKED;
  @Column(nullable=false, updatable=false) private Instant createdAt = Instant.now();
}
