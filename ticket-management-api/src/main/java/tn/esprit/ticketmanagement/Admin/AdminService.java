package tn.esprit.ticketmanagement.Admin;

import jakarta.mail.MessagingException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.Admin.dto.CreateUserRequest;
import tn.esprit.ticketmanagement.Admin.dto.UserDTO;
import tn.esprit.ticketmanagement.Admin.dto.UserStatsDTO;
import tn.esprit.ticketmanagement.Notification.NotificationType;
import tn.esprit.ticketmanagement.Notification.PlatformNotificationService;
import tn.esprit.ticketmanagement.User.enums.Departement;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.TokenRepository;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.auth.service.Emailservice;
import tn.esprit.ticketmanagement.role.Role;
import tn.esprit.ticketmanagement.Audit.entity.AuditLog;
import tn.esprit.ticketmanagement.Audit.service.AuditLogService;
import tn.esprit.ticketmanagement.User.service.UserPagePermissionService;
import tn.esprit.ticketmanagement.role.RoleRepository;


import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {


    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    private final PasswordEncoder passwordEncoder;
    private final PlatformNotificationService platformNotificationService;
    private final Emailservice emailService;
    private final TokenRepository tokenRepository;
    private final JdbcTemplate jdbcTemplate;
    private final UserPagePermissionService userPagePermissionService;
    private final AuditLogService auditLogService;




    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public UserDTO getUserById(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return convertToDTO(user);
    }
    public UserDTO createUser(CreateUserRequest request) {
        boolean isBA = "ROLE_BUSINESS_ANALYST".equals(request.getRole());
        
        // Username is required only for BA role
        if (isBA && (request.getUsername() == null || request.getUsername().isBlank())) {
            throw new IllegalArgumentException("Le nom d'utilisateur Mantis est obligatoire pour un Business Analyst");
        }

        userRepository.findByEmail(request.getEmail())
                .ifPresent(u -> {
                    throw new RuntimeException("Cet email est déjà utilisé");
                });

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + request.getRole()));

        // For BA: use Mantis username; for others: use email as username
        String username = isBA ? request.getUsername() : request.getEmail();

        User user = User.builder()
                .username(username)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .dateOfBirth(request.getDateOfBirth())
                .password(passwordEncoder.encode(request.getPassword()))
                .enabled(true)
                .accountLocked(false)
                .roles(new ArrayList<>(List.of(role)))
                .departement(request.getDepartement())
                .mantisProject(
                        request.getMantisProjects() != null && !request.getMantisProjects().isEmpty()
                                ? String.join(",", request.getMantisProjects())
                                : request.getMantisProject()
                )
                .build();

        User savedUser = userRepository.save(user);

        userPagePermissionService.grantAllDefaultPages(savedUser.getId());

        try {
            emailService.sendWelcomeEmail(
                    request.getEmail(),
                    request.getFirstName(),
                    request.getLastName(),
                    request.getPassword(),
                    request.getRole()
            );
            System.out.println("✅ Email envoyé à : " + request.getEmail());
        } catch (MessagingException e) {
            System.err.println("❌ Erreur envoi email : " + e.getMessage());
        }

        return convertToDTO(savedUser);
    }

    public UserDTO updateUser(Integer id, UserDTO userDTO) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setPhone(userDTO.getPhone());
        user.setDateOfBirth(userDTO.getDateOfBirth());
        user.setDepartement(userDTO.getDepartement());

        if (!user.getEmail().equals(userDTO.getEmail())) {
            userRepository.findByEmail(userDTO.getEmail())
                    .ifPresent(existingUser -> {
                        if (!existingUser.getId().equals(id)) {
                            throw new RuntimeException("Cet email est déjà utilisé");
                        }
                    });
            user.setEmail(userDTO.getEmail());
        }

        if (userDTO.getRoles() != null && !userDTO.getRoles().isEmpty()) {
            String roleName = userDTO.getRoles().get(0);
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));

            List<Role> roles = new ArrayList<>();
            roles.add(role);
            user.setRoles(roles);
        }

        // Update Mantis fields
        if (userDTO.getMantisProject() != null) {
            user.setMantisProject(userDTO.getMantisProject());
        }
        if (userDTO.getMantisProjects() != null && !userDTO.getMantisProjects().isEmpty()) {
            user.setMantisProject(String.join(",", userDTO.getMantisProjects()));
        }
        if (userDTO.getUsername() != null && !userDTO.getUsername().isBlank()) {
            user.setUsername(userDTO.getUsername());
        }

        User updatedUser = userRepository.save(user);

        // Notify the user about the profile update
        platformNotificationService.createAndPush(user.getId(),
                NotificationType.USER_UPDATED,
                "Profil mis à jour",
                "Votre profil a été modifié par un administrateur",
                user.getId().toString());

        return convertToDTO(updatedUser);
    }

    public UserDTO updateUserRole(Integer id, String roleName) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));

        List<Role> roles = new ArrayList<>();
        roles.add(role);
        user.setRoles(roles);

        User updatedUser = userRepository.save(user);

        // Notify the user about role change
        platformNotificationService.createAndPush(user.getId(),
                NotificationType.USER_UPDATED,
                "Rôle modifié",
                "Votre rôle a été changé en " + roleName.replace("ROLE_", ""),
                user.getId().toString());

        return convertToDTO(updatedUser);
    }

    public UserDTO toggleUserStatus(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        user.setEnabled(!user.isEnabled());
        User updatedUser = userRepository.save(user);
        return convertToDTO(updatedUser);
    }
    @Transactional
    public void deleteUser(Integer id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found");
        }

        log.info("Début du nettoyage pour la suppression de l'utilisateur ID: {}", id);

        // 1. Nettoyage de l'historique des tickets
        jdbcTemplate.update("DELETE FROM ticket_history WHERE changed_by = ?", id);

        // 2. Nettoyage des commentaires
        jdbcTemplate.update("DELETE FROM ticket_comments WHERE author_id = ?", id);

        // 3. Nettoyage du Chat / Messages
        jdbcTemplate.update("DELETE FROM messages WHERE sender_id = ?", id);
        jdbcTemplate.update("DELETE FROM conversation WHERE sender_id = ? OR recipient_id = ?", id, id);

        // 4. Détacher l'utilisateur des tickets existants
        jdbcTemplate.update("UPDATE tickets SET assigned_to_id = NULL WHERE assigned_to_id = ?", id);
        jdbcTemplate.update("UPDATE tickets SET creator_id = NULL WHERE creator_id = ?", id);

        // 5. Nettoyer les rôles et les tokens de sécurité
        jdbcTemplate.update("DELETE FROM users_roles WHERE users_id = ?", id);
        jdbcTemplate.update("DELETE FROM token WHERE user_id = ?", id);

        // 5b. Nettoyage des permissions page-level
        userPagePermissionService.deleteByUserId(id);

        // 6. Suppression finale de l'utilisateur !
        userRepository.deleteById(id);

        log.info("L'utilisateur ID: {} a été complètement supprimé.", id);
    }

    public UserStatsDTO getUserStats() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByEnabled(true);
        long inactiveUsers = userRepository.countByEnabled(false);

        long userCount = userRepository.countByRoleName("ROLE_USER");
        long operationnelCount = userRepository.countByRoleName("ROLE_OPERATIONNEL");
        long itCount = userRepository.countByRoleName("ROLE_BUSINESS_ANALYST");
        long adminCount = userRepository.countByRoleName("ROLE_ADMIN");

        return UserStatsDTO.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .inactiveUsers(inactiveUsers)
                .userCount(userCount)
                .operationnelCount(operationnelCount)
                .itCount(itCount)
                .adminCount(adminCount)
                .build();
    }

    public List<UserDTO> searchUsers(String query, String role, Boolean enabled) {
        List<User> users = userRepository.findAll();

        if (query != null && !query.isEmpty()) {
            users = users.stream()
                    .filter(u -> u.getFirstName().toLowerCase().contains(query.toLowerCase())
                            || u.getLastName().toLowerCase().contains(query.toLowerCase())
                            || u.getEmail().toLowerCase().contains(query.toLowerCase()))
                    .collect(Collectors.toList());
        }

        if (role != null) {
            users = users.stream()
                    .filter(u -> u.getRoles().stream()
                            .anyMatch(r -> r.getName().equals(role)))
                    .collect(Collectors.toList());
        }

        if (enabled != null) {
            users = users.stream()
                    .filter(u -> u.isEnabled() == enabled)
                    .collect(Collectors.toList());
        }

        return users.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private UserDTO convertToDTO(User user) {
        UserDTO.UserDTOBuilder builder = UserDTO.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .dateOfBirth(user.getDateOfBirth())
                .email(user.getEmail())
                .enabled(user.isEnabled())
                .accountLocked(user.getAccountLocked())
                .roles(user.getRoles().stream()
                        .map(Role::getName)
                        .collect(Collectors.toList()))
                .createdDate(user.getCreatedDate())
                .departement(user.getDepartement())
                .username(user.getMantisUsername())
                .mantisProject(user.getMantisProject());

        if (user.getMantisProject() != null && !user.getMantisProject().isBlank()) {
            builder.mantisProjects(List.of(user.getMantisProject().split("\\s*,\\s*")));
        } else {
            builder.mantisProjects(List.of());
        }

        return builder.build();
    }


    public List<UserDTO> getUsersByDepartement(Departement departement) {
        return userRepository.findByDepartement(departement)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public UserDTO updateUserDepartement(Integer id, Departement departement) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        user.setDepartement(departement);
        return convertToDTO(userRepository.save(user));
    }
}