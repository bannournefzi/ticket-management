package tn.esprit.ticketmanagement.User.entity;

import com.fasterxml.jackson.annotation.JsonIgnore; // <--- 1. Add this import
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_sessions")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false, unique = true)
    private String jwtId;

    private String ipAddress;
    private String deviceOs;
    private String browser;

    @Column(nullable = false)
    private LocalDateTime loginAt;

    @Column(nullable = false)
    private LocalDateTime lastActivityAt;

    private boolean isValid;
}