package tn.esprit.ticketmanagement.group.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupRequest {

    @NotBlank(message = "Le nom du groupe est obligatoire")
    private String name;

    private String description;
}