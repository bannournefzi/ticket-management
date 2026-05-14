package tn.esprit.ticketmanagement.Ticket.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentDTO {

    private Integer id;
    private String content;
    private Boolean internalNote;
    private String source;

    // Auteur
    private Integer authorId;
    private String authorFullName;
    private String authorEmail;
    private String authorRole;

    // Ticket
    private Integer ticketId;

    private LocalDateTime createdDate;
}
