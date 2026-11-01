package com.voltflow.entity;
import jakarta.persistence.*; import lombok.*; import java.time.Instant;
@Entity @Table(name="notifications",indexes=@Index(name="idx_notification_user",columnList="user_id")) @Getter @Setter @NoArgsConstructor
public class Notification { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(optional=false) @JoinColumn(name="user_id") private User user; @Column(nullable=false) private String message; @Column(nullable=false) private boolean readFlag=false; @Column(nullable=false) private Instant createdAt=Instant.now(); }
