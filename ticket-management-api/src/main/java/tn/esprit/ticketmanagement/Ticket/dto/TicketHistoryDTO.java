package tn.esprit.ticketmanagement.Ticket.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class TicketHistoryDTO {

    private Integer id;
    private Integer ticketId;
    private String fieldChanged;
    private String oldValue;
    private String newValue;
    private String comment;
    private String changedByFullName;
    private LocalDateTime changedAt;
}
