package com.voltflow.repository;
import com.voltflow.entity.*; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface ChargerRepository extends JpaRepository<Charger,Long> { List<Charger> findByStationId(Long stationId); long countByStatus(ChargerStatus status); }
