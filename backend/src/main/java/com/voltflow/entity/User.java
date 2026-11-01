package com.voltflow.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity @Table(name="users", indexes=@Index(name="idx_users_role", columnList="role"))
@Getter @Setter @NoArgsConstructor
public class User {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @Column(nullable=false, length=100) private String fullName;
  @Column(nullable=false, unique=true, length=190) private String email;
  @JsonIgnore @Column(nullable=false) private String passwordHash;
  @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private Role role = Role.DRIVER;
  @Column(nullable=false) private boolean enabled = true;
  @Column(nullable=false, updatable=false) private Instant createdAt = Instant.now();
}
