package tn.esprit.ticketmanagement.service;


import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import tn.esprit.ticketmanagement.Admin.AdminService;
import tn.esprit.ticketmanagement.Admin.dto.CreateUserRequest;
import tn.esprit.ticketmanagement.Admin.dto.UserDTO;
import tn.esprit.ticketmanagement.Audit.service.AuditLogService;
import tn.esprit.ticketmanagement.Notification.PlatformNotificationService;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.TokenRepository;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.User.service.UserPagePermissionService;
import tn.esprit.ticketmanagement.auth.service.Emailservice;
import tn.esprit.ticketmanagement.role.Role;
import tn.esprit.ticketmanagement.role.RoleRepository;

import java.util.List;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock UserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock PlatformNotificationService platformNotificationService;
    @Mock Emailservice emailService;
    @Mock TokenRepository tokenRepository;
    @Mock JdbcTemplate jdbcTemplate;
    @Mock UserPagePermissionService userPagePermissionService;
    @Mock AuditLogService auditLogService;

    @InjectMocks
    AdminService adminService;

    @Test
    void createUser_shouldSaveAndReturnDTO() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setFirstName("Bannour");
        request.setLastName("Nefzi");
        request.setEmail("bannour@test.com");
        request.setPassword("pass123");
        request.setRole("ROLE_USER");

        Role role = new Role();
        role.setName("ROLE_USER");

        User savedUser = User.builder()
                .id(1).firstName("Bannour").lastName("Nefzi")
                .email("bannour@test.com").roles(List.of(role))
                .enabled(true)
                .accountLocked(false)
                .build();

        when(userRepository.findByEmail("bannour@test.com")).thenReturn(Optional.empty());
        when(roleRepository.findByName("ROLE_USER")).thenReturn(Optional.of(role));
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any())).thenReturn(savedUser);

        UserDTO result = adminService.createUser(request);

        assertThat(result.getEmail()).isEqualTo("bannour@test.com");
        verify(userPagePermissionService).grantAllDefaultPages(1);
    }

    @Test
    void createUser_shouldThrowWhenEmailAlreadyUsed() {
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("exists@test.com");
        request.setRole("ROLE_USER");

        when(userRepository.findByEmail("exists@test.com"))
                .thenReturn(Optional.of(new User()));

        assertThatThrownBy(() -> adminService.createUser(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("déjà utilisé");
    }

    @Test
    void getUserStats_shouldReturnCounts() {
        when(userRepository.count()).thenReturn(10L);
        when(userRepository.countByEnabled(true)).thenReturn(8L);
        when(userRepository.countByEnabled(false)).thenReturn(2L);
        when(userRepository.countByRoleName(any())).thenReturn(3L);

        var stats = adminService.getUserStats();

        assertThat(stats.getTotalUsers()).isEqualTo(10L);
        assertThat(stats.getActiveUsers()).isEqualTo(8L);
    }
}
