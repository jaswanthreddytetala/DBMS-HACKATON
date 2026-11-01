package com.voltflow.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.util.*;

@Entity @Table(name="charging_stations", indexes={@Index(name="idx_station_city",columnList="city"),@Index(name="idx_station_coordinates",columnList="latitude,longitude")})
@Getter @Setter @NoArgsConstructor
public class ChargingStation {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @NotBlank @Column(nullable=false) private String name;
  @NotBlank @Column(nullable=false) private String address;
  @NotBlank @Column(nullable=false, length=100) private String city;
  @NotNull @Column(nullable=false, precision=10, scale=7) private BigDecimal latitude;
  @NotNull @Column(nullable=false, precision=10, scale=7) private BigDecimal longitude;
  @NotNull @PositiveOrZero @Column(nullable=false, precision=10, scale=2) private BigDecimal pricePerKwh;
  @Column(nullable=false) private String operatingHours = "24/7";
  @Column(nullable=false) private boolean available = true;
  @JsonIgnore @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="operator_id") private User operator;
  @OneToMany(mappedBy="station", cascade=CascadeType.ALL, orphanRemoval=true) private List<Charger> chargers = new ArrayList<>();
}
