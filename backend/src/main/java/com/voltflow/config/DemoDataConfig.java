package com.voltflow.config;

import com.voltflow.entity.Role;
import com.voltflow.entity.Charger;
import com.voltflow.entity.ChargerStatus;
import com.voltflow.entity.ChargingStation;
import com.voltflow.entity.User;
import com.voltflow.repository.StationRepository;
import com.voltflow.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Configuration
public class DemoDataConfig {
  @Bean
  CommandLineRunner demoUsers(UserRepository users, StationRepository stations, PasswordEncoder encoder) {
    return args -> {
      create(users, encoder, "Alex Morgan", "admin@voltflow.com", Role.ADMIN);
      create(users, encoder, "Maya Chen", "driver@voltflow.com", Role.DRIVER);
      create(users, encoder, "Jordan Lee", "operator@voltflow.com", Role.OPERATOR);
      createStations(stations);
    };
  }

  private void createStations(StationRepository repository) {
    Set<String> existingNames = repository.findAll().stream()
      .map(ChargingStation::getName)
      .collect(Collectors.toSet());

    List<ChargingStation> demoStations = List.of(
      station("Indiranagar Fast Charge", "100 Feet Road, Indiranagar", "Bengaluru", "12.9719", "77.6412", "18.50", "BLR-IND"),
      station("Koramangala Green Hub", "5th Block, Koramangala", "Bengaluru", "12.9345", "77.6113", "17.00", "BLR-KOR"),
      station("MG Road Central Station", "Mahatma Gandhi Road, Ashok Nagar", "Bengaluru", "12.9756", "77.6068", "20.00", "BLR-MGR"),
      station("Whitefield Tech Park Charge", "ITPL Main Road, Whitefield", "Bengaluru", "12.9850", "77.7460", "16.50", "BLR-WHT"),
      station("Jayanagar South Point", "4th Block, Jayanagar", "Bengaluru", "12.9250", "77.5838", "15.50", "BLR-JAY"),
      station("Hebbal North Gateway", "Outer Ring Road, Hebbal", "Bengaluru", "13.0358", "77.5970", "18.00", "BLR-HEB")
    );

    demoStations.stream()
      .filter(station -> !existingNames.contains(station.getName()))
      .forEach(repository::save);
  }

  private ChargingStation station(
    String name,
    String address,
    String city,
    String latitude,
    String longitude,
    String pricePerKwh,
    String chargerPrefix
  ) {
    ChargingStation station = new ChargingStation();
    station.setName(name);
    station.setAddress(address);
    station.setCity(city);
    station.setLatitude(new BigDecimal(latitude));
    station.setLongitude(new BigDecimal(longitude));
    station.setPricePerKwh(new BigDecimal(pricePerKwh));
    station.setOperatingHours("24/7");
    station.setAvailable(true);

    addCharger(station, chargerPrefix + "-01", "CCS2", "60");
    addCharger(station, chargerPrefix + "-02", "Type 2", "22");
    return station;
  }

  private void addCharger(ChargingStation station, String code, String connectorType, String powerKw) {
    Charger charger = new Charger();
    charger.setCode(code);
    charger.setConnectorType(connectorType);
    charger.setPowerKw(new BigDecimal(powerKw));
    charger.setStatus(ChargerStatus.AVAILABLE);
    charger.setStation(station);
    station.getChargers().add(charger);
  }

  private void create(UserRepository users, PasswordEncoder encoder, String name, String email, Role role) {
    if (users.existsByEmail(email)) return;
    User user = new User();
    user.setFullName(name);
    user.setEmail(email);
    user.setPasswordHash(encoder.encode("VoltFlow@2026"));
    user.setRole(role);
    users.save(user);
  }
}
