package tn.esprit.ticketmanagement.Ticket.dto;

import lombok.*;

import java.util.List;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class TicketSuggestionResponse {

    private String aiRecommendation;

    private double confidence;

    private List<SuggestionItem> suggestions;

    private boolean hasSuggestions;
}
