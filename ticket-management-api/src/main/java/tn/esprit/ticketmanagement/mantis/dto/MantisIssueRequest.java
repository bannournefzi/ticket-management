package tn.esprit.ticketmanagement.mantis.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MantisIssueRequest {

    private MantisRef project;
    private String summary;
    private String description;
    private MantisRef category;
    private MantisRef priority;
    private MantisRef severity;
    private MantisRef reporter;

    @Data
    @Builder
    public static class MantisRef {
        private Long id;
        private String name;
    }

    @Data
    @Builder
    public static class IssueWrapper {
        private MantisIssueRequest issue;
    }
}