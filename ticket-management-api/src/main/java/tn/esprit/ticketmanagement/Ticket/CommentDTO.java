package tn.esprit.ticketmanagement.Ticket;

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

    // Auteur
    private Integer authorId;
    private String authorFullName;
    private String authorEmail;
    private String authorRole;

    // Ticket
    private Integer ticketId;

    private LocalDateTime createdDate;
}
