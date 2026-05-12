package tn.esprit.ticketmanagement.Admin.dto;


import lombok.*;
import tn.esprit.ticketmanagement.User.enums.Departement;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Integer id;
    private String firstName;
    private String lastName;
    private String email;
    private boolean enabled;
    private boolean accountLocked;
    private List<String> roles;
    private LocalDateTime createdDate;

    private String phone;
    private LocalDate dateOfBirth;
    private Departement departement;

    private String username;
    private String mantisProject;

}
