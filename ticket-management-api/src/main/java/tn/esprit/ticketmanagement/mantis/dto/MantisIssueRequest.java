package tn.esprit.ticketmanagement.mantis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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


    @Data
    @Builder
    public static class MantisRef {
        private Long id;
        private String name;
    }
}