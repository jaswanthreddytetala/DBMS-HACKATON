package com.voltflow.controller;

import com.voltflow.dto.BookingDtos.SessionView;
import com.voltflow.entity.*;
import com.voltflow.repository.*;
import com.voltflow.service.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/analytics") @RequiredArgsConstructor
public class AnalyticsController {
  private final StationRepository stations;
  private final ChargerRepository chargers;
  private final SessionRepository sessions;
  private final UserRepository users;
  private final SessionService sessionService;

  @GetMapping("/overview")
  Map<String, Object> overview() {
    return Map.of(
      "stations", stations.count(),
      "chargers", chargers.count(),
      "activeSessions", sessions.countByStatus(SessionStatus.CHARGING),
      "completedSessions", sessions.countByStatus(SessionStatus.COMPLETED),
      "users", users.count(),
      "availableChargers", chargers.countByStatus(ChargerStatus.AVAILABLE),
      "occupiedChargers", chargers.countByStatus(ChargerStatus.OCCUPIED),
      "offlineChargers", chargers.countByStatus(ChargerStatus.OFFLINE),
      "energyKwh", valueOrZero(sessions.sumEnergyByStatus(SessionStatus.COMPLETED)),
      "revenue", valueOrZero(sessions.sumCostByStatus(SessionStatus.COMPLETED))
    );
  }

  @GetMapping("/sessions")
  List<SessionView> sessions() {
    return sessionService.listAll();
  }

  private BigDecimal valueOrZero(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }
}
