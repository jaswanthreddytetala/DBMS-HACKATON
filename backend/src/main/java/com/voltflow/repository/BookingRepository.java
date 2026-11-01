package com.voltflow.repository;
import com.voltflow.entity.Booking;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking,Long> {
  @EntityGraph(attributePaths = {"charger", "charger.station"})
  List<Booking> findByDriverEmailOrderByScheduledAtDesc(String email);
}
