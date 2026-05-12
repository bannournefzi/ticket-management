package tn.esprit.ticketmanagement.KnowledgeBase.dto;

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
}