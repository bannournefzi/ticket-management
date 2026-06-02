package tn.esprit.ticketmanagement.Ticket.dto;

import lombok.*;
import tn.esprit.ticketmanagement.Ticket.enums.SuggestionType;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class SuggestionItem {

    private SuggestionType type;

    private double similarityScore;

    private String title;

    // Ticket fields (SAME_USER_TICKET / OTHER_USER_TICKET)
    private Integer ticketId;

    private String description;

    private String resolvedDate;

    private Long linkedArticleId;

    // KB article fields (KB_ARTICLE)
    private Long articleId;

    private String solution;

    private String createdAt;

    private Integer linkedTicketId;
}
