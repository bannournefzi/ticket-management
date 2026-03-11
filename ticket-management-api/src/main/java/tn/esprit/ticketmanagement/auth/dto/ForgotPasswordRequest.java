package tn.esprit.ticketmanagement.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ForgotPasswordRequest {

    @Email(message = "Email invalide")
    @NotBlank(message = "L'email est obligatoire")
    private String email;
}
