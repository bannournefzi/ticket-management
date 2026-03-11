package tn.esprit.ticketmanagement.Ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import tn.esprit.ticketmanagement.User.enums.Departement;

import java.util.List;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class CreateTicketRequest {

    @NotBlank(message = "Le titre est obligatoire")
    @Size(min = 5, max = 200)
    private String title;

    @NotBlank(message = "La description est obligatoire")
    @Size(min = 10, max = 5000)
    private String description;

    @NotNull(message = "La priorité est obligatoire")
    private TicketPriority priority;

    @NotNull(message = "La catégorie est obligatoire")
    private TicketCategory category;

    private Departement departement;
    private Integer assignedToId;

    private List<String> tags;   // ← CE CHAMP MANQUAIT
}