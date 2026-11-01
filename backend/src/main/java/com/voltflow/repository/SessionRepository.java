package com.voltflow.repository;
import com.voltflow.entity.*;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface SessionRepository extends JpaRepository<ChargingSession,Long> {
  @EntityGraph(attributePaths = {"booking", "charger", "charger.station"})
  List<ChargingSession> findByDriverEmailOrderByStartedAtDesc(String email);

  long countByStatus(SessionStatus status);
  long countByStatusIn(List<SessionStatus> statuses);

  @Query("select coalesce(sum(s.energyKwh), 0) from ChargingSession s where s.status = :status")
  BigDecimal sumEnergyByStatus(@Param("status") SessionStatus status);

  @Query("select coalesce(sum(s.totalCost), 0) from ChargingSession s where s.status = :status")
  BigDecimal sumCostByStatus(@Param("status") SessionStatus status);

  @EntityGraph(attributePaths = {"booking", "charger", "charger.station"})
  List<ChargingSession> findAllByOrderByStartedAtDesc();
}
