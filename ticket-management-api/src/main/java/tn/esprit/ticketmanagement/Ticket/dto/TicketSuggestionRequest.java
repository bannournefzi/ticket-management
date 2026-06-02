package tn.esprit.ticketmanagement.Ticket.dto;

import lombok.*;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class TicketSuggestionRequest {

    private String title;

    private String description;
}
