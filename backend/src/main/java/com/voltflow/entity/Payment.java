package com.voltflow.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant;
@Entity @Table(name="payments") @Getter @Setter @NoArgsConstructor
public class Payment { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @OneToOne(optional=false) @JoinColumn(name="session_id",unique=true) private ChargingSession session; @Column(nullable=false,precision=10,scale=2) private BigDecimal amount; @Column(nullable=false,length=20) private String status; @Column(nullable=false) private Instant createdAt=Instant.now(); }
