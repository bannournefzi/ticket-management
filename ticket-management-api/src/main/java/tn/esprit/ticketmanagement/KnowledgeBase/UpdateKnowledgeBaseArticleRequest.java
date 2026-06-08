package tn.esprit.ticketmanagement.KnowledgeBase;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class UpdateKnowledgeBaseArticleRequest {

    @NotBlank(message = "Le titre est obligatoire")
    private String title;

    private String description;

    @NotBlank(message = "La solution est obligatoire")
    private String solution;

    private String category;
}
