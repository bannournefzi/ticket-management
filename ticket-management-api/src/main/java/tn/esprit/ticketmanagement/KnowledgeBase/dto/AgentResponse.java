package tn.esprit.ticketmanagement.KnowledgeBase.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AgentResponse {
    private String reply;
    private AgentAction action;
    @Builder.Default
    private List<String> options = List.of();
    private TicketData ticketData;

    @Data
    @Builder
    @AllArgsConstructor
    public static class TicketData {
        private String title;
        private String description;
        private String category;
        private String priority;
    }
}