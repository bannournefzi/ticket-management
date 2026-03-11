package tn.esprit.ticketmanagement.auth.entity;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class RegistrationRequest  {

    @NotEmpty(message = "Firstname is mandatory")
    @NotBlank(message = "Firstname is mandatory")
    private String firstName;

    @NotEmpty(message = "Lastname is mandatory")
    @NotBlank(message = "Lastname is mandatory")
    private String lastName;

    @Email(message ="Email is not formatted")
    @NotEmpty(message = "email is mandatory")
    @NotBlank(message = "email is mandatory")
    private String email;

    @NotEmpty(message = "password is mandatory")
    @NotBlank(message = "password is mandatory")
    @Size(min = 8, message ="password should be 8 char")
    private String password;

    private String dateOfBirth;
    private String role;

}

