package tn.esprit.ticketmanagement.Ticket;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.enums.Departement;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tickets", indexes = {
        @Index(name = "idx_ticket_status", columnList = "status"),
        @Index(name = "idx_ticket_priority", columnList = "priority"),
        @Index(name = "idx_ticket_creator", columnList = "creator_id"),
        @Index(name = "idx_ticket_assignee", columnList = "assigned_to_id"),
        @Index(name = "idx_ticket_due_date", columnList = "due_date")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Ticket {

    @Id                                                    // ← must be here
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "mantis_id")
    private Long mantisId;

    @Column(name = "mantis_project_id")
    private Long mantisProjectId;


    @NotBlank(message = "Le titre est obligatoire")
    @Size(min = 5, max = 200)
    private String title;

    @NotBlank(message = "La description est obligatoire")
    @Size(min = 10, max = 5000)
    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    private TicketPriority priority;

    @NotNull
    @Enumerated(EnumType.STRING)
    private TicketStatus status;

    @NotNull
    @Column(nullable = false)
    private String category;

    @Enumerated(EnumType.STRING)
    private Departement departement;

    // ===== Relations =====

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private User assignedTo;

    // ===== SLA (NOUVEAU) =====

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "first_response_due")
    private LocalDateTime firstResponseDue;

    @Column(name = "first_response_at")
    private LocalDateTime firstResponseAt;

    // ===== Tags (NOUVEAU) =====

    @ElementCollection
    @CollectionTable(name = "ticket_tags", joinColumns = @JoinColumn(name = "ticket_id"))
    @Column(name = "tag")
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    // ===== Comments Enabled (NOUVEAU) =====

    @Column(name = "comments_enabled")
    @Builder.Default
    private Boolean commentsEnabled = true;

    // ===== Converted to KB (NOUVEAU) =====

    @Column(name = "converted_to_kb")
    @Builder.Default
    private Boolean convertedToKB = false;

    // ===== Dates =====

    @CreatedDate
    @Column(name = "created_date", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @LastModifiedDate
    @Column(name = "last_modified_date")
    private LocalDateTime lastModifiedDate;

    @Column(name = "resolved_date")
    private LocalDateTime resolvedDate;

    @Column(name = "closed_date")
    private LocalDateTime closedDate;

    // ===== Relations listes =====

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TicketHistory> history = new ArrayList<>();

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    // ===== Calcul automatique du SLA à la création =====

    @PrePersist
    public void prePersist() {
        if (this.status == null) this.status = TicketStatus.NEW;
        if (this.priority != null) {
            if (this.dueDate == null) {
                this.dueDate = SLAConfig.calculateDueDate(this.priority, LocalDateTime.now());
            }
            if (this.firstResponseDue == null) {
                this.firstResponseDue = SLAConfig.calculateFirstResponseDue(
                        this.priority, LocalDateTime.now());
            }
        }
    }

    // ===== Méthodes métier =====

    public boolean isSLABreached() {
        if (status == TicketStatus.RESOLVED || status == TicketStatus.CLOSED) return false;
        return dueDate != null && LocalDateTime.now().isAfter(dueDate);
    }

    public SLAConfig.SLAStatus getSLAStatus() {
        return SLAConfig.checkSLAStatus(priority, createdDate, status);
    }
}