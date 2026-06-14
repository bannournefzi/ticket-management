package tn.esprit.ticketmanagement.auth.service;

import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.Audit.entity.AuditLog;
import tn.esprit.ticketmanagement.Audit.service.AuditLogService;
import tn.esprit.ticketmanagement.auth.dto.ChangePasswordRequest;
import tn.esprit.ticketmanagement.auth.dto.FirstLoginChangePasswordRequest;
import tn.esprit.ticketmanagement.auth.dto.ForgotPasswordRequest;
import tn.esprit.ticketmanagement.auth.entity.PasswordResetToken;
import tn.esprit.ticketmanagement.auth.entity.ResetPasswordRequest;
import tn.esprit.ticketmanagement.auth.repository.PasswordResetTokenRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final Emailservice emailservice;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    // ────────────────────────────────────────────────────────────────────────────
    // FORGOT PASSWORD  →  send reset link by email
    // ────────────────────────────────────────────────────────────────────────────

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) throws MessagingException {

        // Always return 200 even if email not found (prevent user enumeration)
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            try {
                // Invalidate old tokens for this user
                tokenRepository.deleteAllByUserId(user.getId());

                // Generate a secure UUID token
                String token = UUID.randomUUID().toString();

                PasswordResetToken resetToken = PasswordResetToken.builder()
                        .token(token)
                        .user(user)
                        .createdAt(LocalDateTime.now())
                        .expiresAt(LocalDateTime.now().plusHours(1))
                        .build();

                tokenRepository.save(resetToken);

                // Build reset link  (frontend URL)
                String resetLink = "http://localhost:4200/reset-password?token=" + token;

                emailservice.sendPasswordResetEmail(
                        user.getEmail(),
                        user.getFirstName(),
                        resetLink
                );

                auditLogService.log(user.getId(), user.fullName(), AuditLog.ACTION_FORGOT_PASSWORD,
                        "Auth", "User", user.getId().longValue(),
                        "Demande de réinitialisation de mot de passe pour " + user.getEmail());

            } catch (MessagingException e) {
                throw new RuntimeException("Erreur lors de l'envoi de l'email", e);
            }
        });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // RESET PASSWORD  →  validate token and set new password
    // ────────────────────────────────────────────────────────────────────────────

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Les mots de passe ne correspondent pas");
        }

        PasswordResetToken resetToken = tokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Token invalide ou expiré"));

        if (resetToken.isExpired()) {
            throw new RuntimeException("Ce lien a expiré. Veuillez faire une nouvelle demande.");
        }

        if (resetToken.isUsed()) {
            throw new RuntimeException("Ce lien a déjà été utilisé.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setEnabled(true);
        user.setAccountLocked(false);
        userRepository.save(user);

        resetToken.setUsedAt(LocalDateTime.now());
        tokenRepository.save(resetToken);

        auditLogService.log(user.getId(), user.fullName(), AuditLog.ACTION_RESET_PASSWORD,
                "Auth", "User", user.getId().longValue(),
                "Réinitialisation du mot de passe pour " + user.getEmail());
    }

    // ────────────────────────────────────────────────────────────────────────────
    // CHANGE PASSWORD  →  for authenticated users (from their profile)
    // ────────────────────────────────────────────────────────────────────────────

    @Transactional
    public void changePassword(ChangePasswordRequest request, String userEmail) {

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Les mots de passe ne correspondent pas");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Le mot de passe actuel est incorrect");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Le nouveau mot de passe doit être différent de l'ancien");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setEnabled(true);
        user.setAccountLocked(false);
        user.setMustChangePassword(false);
        userRepository.save(user);

        auditLogService.log(user.getId(), user.fullName(), AuditLog.ACTION_CHANGE_PASSWORD,
                "Auth", "User", user.getId().longValue(),
                "Changement de mot de passe pour " + user.getEmail());
    }

    // ────────────────────────────────────────────────────────────────────────────
    // FIRST-LOGIN CHANGE PASSWORD  →  no current password required
    // ────────────────────────────────────────────────────────────────────────────

    @Transactional
    public void firstLoginChangePassword(FirstLoginChangePasswordRequest request, String userEmail) {

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Les mots de passe ne correspondent pas");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (!Boolean.TRUE.equals(user.getMustChangePassword())) {
            throw new IllegalStateException("Aucun changement de mot de passe obligatoire requis");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Le nouveau mot de passe doit être différent de l'ancien");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        auditLogService.log(user.getId(), user.fullName(), AuditLog.ACTION_CHANGE_PASSWORD,
                "Auth", "User", user.getId().longValue(),
                "Premier changement de mot de passe pour " + user.getEmail());
    }
}