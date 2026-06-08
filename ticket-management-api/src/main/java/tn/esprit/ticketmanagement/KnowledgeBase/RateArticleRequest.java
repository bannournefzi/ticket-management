package tn.esprit.ticketmanagement.KnowledgeBase;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class RateArticleRequest {

    @NotNull
    private Boolean helpful;
}
