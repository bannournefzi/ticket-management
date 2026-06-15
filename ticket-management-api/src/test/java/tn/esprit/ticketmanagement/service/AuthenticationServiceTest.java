package tn.esprit.ticketmanagement.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.auth.service.AuthenticationService;
import tn.esprit.ticketmanagement.auth.service.Emailservice;
import tn.esprit.ticketmanagement.role.Role;
import tn.esprit.ticketmanagement.role.RoleRepository;
import tn.esprit.ticketmanagement.User.repository.TokenRepository;
import tn.esprit.ticketmanagement.Audit.service.AuditLogService;
import tn.esprit.ticketmanagement.Notification.PlatformNotificationService;
import tn.esprit.ticketmanagement.User.service.UserPagePermissionService;
import tn.esprit.ticketmanagement.auth.entity.RegistrationRequest;
import tn.esprit.ticketmanagement.security.jwtService;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock UserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock TokenRepository tokenRepository;
    @Mock
    Emailservice emailservice;
    @Mock jwtService jwtService;
    @Mock PlatformNotificationService platformNotificationService;
    @Mock UserPagePermissionService userPagePermissionService;
    @Mock AuditLogService auditLogService;
    @Mock HttpServletRequest httpServletRequest;
    @Mock tn.esprit.ticketmanagement.User.repository.UserSessionRepository userSessionRepository;

    @InjectMocks
    AuthenticationService authenticationService;

    @BeforeEach
    void setUp() {
        // inject @Value manually
        org.springframework.test.util.ReflectionTestUtils.setField(
                authenticationService, "activationUrl", "http://localhost:4200/activate-account");
    }

    @Test
    void register_shouldSaveUserAndSendEmail() throws Exception {
        // Arrange
        RegistrationRequest request = RegistrationRequest.builder()
                .firstName("Bannour")
                .lastName("Nefzi")
                .email("bannour@test.com")
                .password("password123")
                .role("ROLE_USER")
                .build();

        Role role = new Role();
        role.setName("ROLE_USER");

        when(roleRepository.findByName("ROLE_USER")).thenReturn(Optional.of(role));
        when(passwordEncoder.encode(any())).thenReturn("encoded_password");
        when(userRepository.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1);
            return u;
        });

        // Act
        authenticationService.register(request);

        // Assert
        verify(userRepository).save(any(User.class));
        verify(userPagePermissionService).grantAllDefaultPages(anyInt());
        verify(emailservice).sendEmail(any(), any(), any(), any(), any(), any());
    }

    @Test
    void register_shouldThrowWhenRoleNotFound() {
        RegistrationRequest request = RegistrationRequest.builder()
                .firstName("Bannour")
                .lastName("Nefzi")
                .email("bannour@test.com")
                .password("password123")
                .role("ROLE_UNKNOWN")  // ← doit matcher le mock
                .build();

        when(roleRepository.findByName("ROLE_UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authenticationService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not found");
    }}
