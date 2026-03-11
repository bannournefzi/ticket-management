package tn.esprit.ticketmanagement.Admin.dto;

import lombok.*;
import tn.esprit.ticketmanagement.User.enums.Departement;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String role;
    private String phone;
    private Departement departement;
}