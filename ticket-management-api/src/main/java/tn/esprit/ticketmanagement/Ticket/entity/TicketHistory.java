package tn.esprit.ticketmanagement.Ticket.entity;

import jakarta.persistence.*;
import lombok.*;
import tn.esprit.ticketmanagement.Ticket.enums.TicketStatus;
import tn.esprit.ticketmanagement.User.entity.User;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_history")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TicketHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status")
    private TicketStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status")
    private TicketStatus newStatus;

    @Column(name = "field_changed")
    private String fieldChanged;  // "status", "priority", "assignee", "title"...

    @Column(name = "old_value")
    private String oldValue;

    @Column(name = "new_value")
    private String newValue;

    @Column(length = 500)
    private String comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by")
    private User changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;
}
