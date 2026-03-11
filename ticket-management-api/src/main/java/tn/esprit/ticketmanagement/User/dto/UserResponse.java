package tn.esprit.ticketmanagement.User.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.esprit.ticketmanagement.User.enums.Departement;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserResponse {

    private Integer id;
    private String firstName;
    private String lastName;
    private String email;
    private LocalDateTime lastSeen;
    private boolean isOnline;
    private Departement departement;

}