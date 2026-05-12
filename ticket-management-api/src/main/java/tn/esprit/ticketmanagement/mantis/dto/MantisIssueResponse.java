package tn.esprit.ticketmanagement.mantis.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MantisIssueResponse {

    private IssueData issue;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class IssueData {
        private Long id;
        private String summary;
        private StatusRef status;
        private StatusRef priority;
        private AssigneeRef assignedTo;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StatusRef {
        private Long id;
        private String name;
        private String label;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AssigneeRef {
        private Long id;
        private String name;
        private String realName;
    }
}
