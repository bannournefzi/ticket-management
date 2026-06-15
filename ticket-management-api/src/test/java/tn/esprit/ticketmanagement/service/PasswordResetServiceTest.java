package tn.esprit.ticketmanagement.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.Audit.service.AuditLogService;
import tn.esprit.ticketmanagement.auth.dto.ChangePasswordRequest;
import tn.esprit.ticketmanagement.auth.repository.PasswordResetTokenRepository;
import tn.esprit.ticketmanagement.auth.service.Emailservice;
import tn.esprit.ticketmanagement.auth.service.PasswordResetService;

import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordResetTokenRepository tokenRepository;
    @Mock
    Emailservice emailservice;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuditLogService auditLogService;

    @InjectMocks
    PasswordResetService passwordResetService;

    @Test
    void changePassword_shouldSucceed() {
        User user = new User();
        user.setId(1);
        user.setEmail("bannour@test.com");
        user.setPassword("encoded_old");

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPassword");
        request.setNewPassword("newPassword123");
        request.setConfirmPassword("newPassword123");

        when(userRepository.findByEmail("bannour@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPassword", "encoded_old")).thenReturn(true);
        when(passwordEncoder.matches("newPassword123", "encoded_old")).thenReturn(false);
        when(passwordEncoder.encode("newPassword123")).thenReturn("encoded_new");

        passwordResetService.changePassword(request, "bannour@test.com");

        verify(userRepository).save(user);
        assertThat(user.getPassword()).isEqualTo("encoded_new");
    }

    @Test
    void changePassword_shouldThrowWhenPasswordMismatch() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setNewPassword("abc");
        request.setConfirmPassword("xyz");

        assertThatThrownBy(() -> passwordResetService.changePassword(request, "any@test.com"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ne correspondent pas");
    }

    @Test
    void changePassword_shouldThrowWhenCurrentPasswordWrong() {
        User user = new User();
        user.setPassword("encoded");

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("wrong");
        request.setNewPassword("new123");
        request.setConfirmPassword("new123");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "encoded")).thenReturn(false);

        assertThatThrownBy(() -> passwordResetService.changePassword(request, "test@test.com"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("incorrect");
    }
}
