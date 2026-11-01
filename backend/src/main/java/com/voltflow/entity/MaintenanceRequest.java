package com.voltflow.entity;
import jakarta.persistence.*; import lombok.*; import java.time.Instant;
@Entity @Table(name="maintenance_requests") @Getter @Setter @NoArgsConstructor
public class MaintenanceRequest { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(optional=false) @JoinColumn(name="charger_id") private Charger charger; @Column(nullable=false) private String description; @Column(nullable=false,length=20) private String status="OPEN"; @Column(nullable=false) private Instant createdAt=Instant.now(); }
