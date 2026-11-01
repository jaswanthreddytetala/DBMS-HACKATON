package com.voltflow.repository;
import com.voltflow.entity.ChargingStation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StationRepository extends JpaRepository<ChargingStation,Long> {
  boolean existsByNameIgnoreCaseAndCityIgnoreCase(String name, String city);

  @EntityGraph(attributePaths = "chargers")
  @Override
  List<ChargingStation> findAll();

  @EntityGraph(attributePaths = "chargers")
  List<ChargingStation> findByCityContainingIgnoreCaseOrNameContainingIgnoreCase(String city,String name);
}
