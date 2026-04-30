package tn.esprit.ticketmanagement.Ticket.dto;

import lombok.*;
import tn.esprit.ticketmanagement.Ticket.enums.TicketPriority;
import tn.esprit.ticketmanagement.Ticket.enums.TicketStatus;
import tn.esprit.ticketmanagement.User.enums.Departement;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class TicketDTO {

    private Integer id;
    private String title;
    private String description;

    private TicketPriority priority;
    private TicketStatus status;
    private String category;
    private Departement departement;

    // Créateur
    private Integer creatorId;
    private String creatorFullName;
    private String creatorEmail;

    // Assigné
    private Integer assignedToId;
    private String assignedToFullName;
    private String assignedToEmail;

    // Group
    private Long groupId;
    private String groupName;

    // Dates
    private LocalDateTime createdDate;
    private LocalDateTime lastModifiedDate;
    private LocalDateTime resolvedDate;
    private LocalDateTime closedDate;

    // ===== NOUVEAU =====
    private LocalDateTime dueDate;
    private String slaStatus;
    private List<String> tags;
    private int commentCount;
    private List<TicketStatus> allowedTransitions;

    private Long mantisId;
    private Long mantisProjectId;

    private List<AttachmentDTO> attachments;

    private Boolean commentsEnabled;
}