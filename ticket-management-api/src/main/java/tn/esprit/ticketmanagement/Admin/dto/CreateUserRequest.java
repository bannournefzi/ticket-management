package tn.esprit.ticketmanagement.Admin.dto;

import lombok.Data;
import tn.esprit.ticketmanagement.User.enums.Departement;

import java.time.LocalDate;

@Data
public class CreateUserRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String role;
    private String phone;              // ✅ NOUVEAU
    private LocalDate dateOfBirth;
    private Departement departement;
}