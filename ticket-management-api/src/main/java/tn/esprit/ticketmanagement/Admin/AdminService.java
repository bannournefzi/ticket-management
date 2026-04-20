package tn.esprit.ticketmanagement.Admin;

import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.auth.service.Emailservice;
import tn.esprit.ticketmanagement.role.Role;
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
                .build();

        User savedUser = userRepository.save(user);

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

    public void deleteUser(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Clear relationships that might cause constraint violations
        user.getRoles().clear();
        user.getChatsAsSender().clear();
        user.getChatsAsRecipient().clear();
        userRepository.save(user);

        userRepository.deleteById(id);
    }

    public UserStatsDTO getUserStats() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByEnabled(true);
        long inactiveUsers = userRepository.countByEnabled(false);

        long metierCount = userRepository.countByRoleName("ROLE_METIER");
        long itCount = userRepository.countByRoleName("ROLE_BUSINESS_ANALYST");
        long adminCount = userRepository.countByRoleName("ROLE_ADMIN");

        return UserStatsDTO.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .inactiveUsers(inactiveUsers)
                .metierCount(metierCount)
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
        return UserDTO.builder()
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
                .username(user.getUsername())
                .build();
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