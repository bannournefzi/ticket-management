package tn.esprit.ticketmanagement.Ticket;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequest {

    @NotBlank(message = "Le contenu du commentaire est obligatoire")
    private String content;

    /**
     * Si true, le commentaire est une note interne (visible BA/Admin uniquement)
     */
    private Boolean internalNote = false;
}
