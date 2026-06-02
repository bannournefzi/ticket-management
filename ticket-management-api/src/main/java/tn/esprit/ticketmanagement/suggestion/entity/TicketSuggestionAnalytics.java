package tn.esprit.ticketmanagement.suggestion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_suggestion_analytics")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TicketSuggestionAnalytics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "session_id", nullable = false, length = 100)
    private String sessionId;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    @Column(name = "suggestion_type", length = 30)
    private String suggestionType;

    @Column(name = "suggestion_id")
    private Long suggestionId;

    @Column(name = "ticket_title", length = 200)
    private String ticketTitle;

    @Column(name = "ticket_description", columnDefinition = "TEXT")
    private String ticketDescription;

    @Column(name = "ticket_priority", length = 20)
    private String ticketPriority;

    @Column(name = "ticket_category", length = 50)
    private String ticketCategory;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
