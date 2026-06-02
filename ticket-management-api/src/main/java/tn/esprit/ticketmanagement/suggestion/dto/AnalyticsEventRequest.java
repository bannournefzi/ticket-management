package tn.esprit.ticketmanagement.suggestion.dto;

import lombok.*;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class AnalyticsEventRequest {

    private String sessionId;

    private String eventType;

    private String suggestionType;

    private Long suggestionId;

    private String ticketTitle;

    private String ticketDescription;

    private String ticketPriority;

    private String ticketCategory;
}
