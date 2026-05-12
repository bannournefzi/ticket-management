package tn.esprit.ticketmanagement.mantis.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

@Data
public class PushToMantisRequest {
    @NotNull
    private Long projectId;

    private MantisRef reporter;

    @Data
    @Builder
    public static class MantisRef {
        private Long id;
        private String name;
    }
}
