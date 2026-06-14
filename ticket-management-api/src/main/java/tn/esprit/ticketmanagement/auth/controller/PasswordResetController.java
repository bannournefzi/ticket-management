package tn.esprit.ticketmanagement.auth.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.mail.MessagingException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;                         // ✅ correct import
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.auth.dto.ChangePasswordRequest;
import tn.esprit.ticketmanagement.auth.dto.FirstLoginChangePasswordRequest;
import tn.esprit.ticketmanagement.auth.dto.ForgotPasswordRequest;
import tn.esprit.ticketmanagement.auth.service.PasswordResetService;
import tn.esprit.ticketmanagement.auth.entity.ResetPasswordRequest;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Password Management")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @RequestBody @Valid ForgotPasswordRequest request
    ) throws MessagingException {
        passwordResetService.forgotPassword(request);
        return ResponseEntity.ok(Map.of(
                "message", "Si cet email existe, un lien de réinitialisation a été envoyé."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestBody @Valid ResetPasswordRequest request
    ) {
        passwordResetService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès."));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestBody ChangePasswordRequest request
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Non authentifié"));
        }

        String userEmail = authentication.getName();
        passwordResetService.changePassword(request, userEmail);
        return ResponseEntity.ok(Map.of("message", "Mot de passe modifié avec succès"));
    }

    @PostMapping("/first-login-change-password")
    public ResponseEntity<Map<String, String>> firstLoginChangePassword(
            @RequestBody @Valid FirstLoginChangePasswordRequest request
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Non authentifié"));
        }

        String userEmail = authentication.getName();
        passwordResetService.firstLoginChangePassword(request, userEmail);
        return ResponseEntity.ok(Map.of("message", "Mot de passe modifié avec succès"));
    }
}