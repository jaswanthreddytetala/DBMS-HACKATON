package com.voltflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name="charging_sessions", indexes={@Index(name="idx_session_status",columnList="status"),@Index(name="idx_session_started",columnList="started_at")})
@Getter @Setter @NoArgsConstructor
public class ChargingSession {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="booking_id",unique=true) private Booking booking;
  @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="driver_id") private User driver;
  @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="charger_id") private Charger charger;
  @Column(name="started_at",nullable=false) private Instant startedAt;
  private Instant endedAt;
  @Column(nullable=false, precision=10, scale=3) private BigDecimal energyKwh = BigDecimal.ZERO;
  @Column(nullable=false, precision=10, scale=2) private BigDecimal totalCost = BigDecimal.ZERO;
  @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private SessionStatus status = SessionStatus.CHARGING;
}
