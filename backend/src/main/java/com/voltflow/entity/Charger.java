package com.voltflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity @Table(name="chargers", uniqueConstraints=@UniqueConstraint(name="uk_station_charger_code",columnNames={"station_id","code"}), indexes=@Index(name="idx_charger_status",columnList="status"))
@Getter @Setter @NoArgsConstructor
public class Charger {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @Column(nullable=false, length=30) private String code;
  @Column(nullable=false, length=30) private String connectorType;
  @Column(nullable=false, precision=8, scale=2) private BigDecimal powerKw;
  @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private ChargerStatus status = ChargerStatus.AVAILABLE;
  @JsonIgnore @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="station_id",nullable=false) private ChargingStation station;
}
