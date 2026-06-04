package tn.esprit.ticketmanagement.User.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "user_page_permissions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "page_key"}))
public class UserPagePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "page_key", nullable = false, length = 50)
    private String pageKey;

    @Builder.Default
    @Column(nullable = false)
    private boolean granted = true;
}
