package tn.esprit.ticketmanagement.group.entity;

import jakarta.persistence.*;
import lombok.*;
import tn.esprit.ticketmanagement.User.entity.User;

import java.time.LocalDateTime;

@Entity
@Table(name = "group_membership")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    public boolean isActive() {
        return leftAt == null;
    }

    public boolean wasMemberAt(LocalDateTime atTime) {
        return (joinedAt.isBefore(atTime) || joinedAt.isEqual(atTime))
                && (leftAt == null || leftAt.isAfter(atTime) || leftAt.isEqual(atTime));
    }
}