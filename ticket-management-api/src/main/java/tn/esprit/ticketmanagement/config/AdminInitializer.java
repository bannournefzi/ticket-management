package tn.esprit.ticketmanagement.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.role.Role;
import tn.esprit.ticketmanagement.role.RoleRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(100)
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            log.info("Aucun utilisateur trouvé — création d'un compte admin par défaut...");

            Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                    .orElseThrow(() -> new IllegalStateException("ROLE_ADMIN introuvable — vérifiez l'initialisation des rôles"));

            User admin = User.builder()
                    .username("admin@ticketmanagement.local")
                    .firstName("Admin")
                    .lastName("System")
                    .email("admin@ticketmanagement.local")
                    .password(passwordEncoder.encode("Admin@123!"))
                    .enabled(true)
                    .accountLocked(false)
                    .mustChangePassword(true)
                    .dateOfBirth(LocalDate.of(2000, 1, 1))
                    .roles(new ArrayList<>(List.of(adminRole)))
                    .build();

            userRepository.save(admin);

            log.info("✅ Compte admin créé automatiquement : admin@ticketmanagement.local / Admin@123!");
        } else {
            log.info("Des utilisateurs existent déjà ({}) — pas de création d'admin automatique.", userRepository.count());
        }
    }
}