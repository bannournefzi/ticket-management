package tn.esprit.ticketmanagement.mantis.dto;

import lombok.Data;

@Data
public class MantisIssueResponse {

    private IssueData issue;

    @Data
    public static class IssueData {
        private Long id;
        private String summary;
        private StatusRef status;
        private StatusRef priority;
        private AssigneeRef assignedTo;
    }

    @Data
    public static class StatusRef {
        private Long id;
        private String name;
        private String label;
    }

    @Data
    public static class AssigneeRef {
        private Long id;
        private String name;
        private String realName;
    }
}
