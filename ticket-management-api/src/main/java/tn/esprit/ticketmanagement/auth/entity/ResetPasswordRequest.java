package tn.esprit.ticketmanagement.auth.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {

    @NotBlank(message = "Le token est obligatoire")
    private String token;

    @NotBlank(message = "Le nouveau mot de passe est obligatoire")
    @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
    private String newPassword;

    @NotBlank(message = "La confirmation est obligatoire")
    private String confirmPassword;
}
