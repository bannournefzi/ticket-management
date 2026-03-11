package tn.esprit.ticketmanagement.role;


import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import tn.esprit.ticketmanagement.role.Role;
import tn.esprit.ticketmanagement.role.RoleRepository;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        createRoleIfNotExists("ROLE_ADMIN");
        createRoleIfNotExists("ROLE_BUSINESS_ANALYST");
        createRoleIfNotExists("ROLE_METIER");
    }

    private void createRoleIfNotExists(String roleName) {
        if (roleRepository.findByName(roleName).isEmpty()) {
            Role role = Role.builder()
                    .name(roleName)
                    .build();
            roleRepository.save(role);
            System.out.println("✅ Rôle créé : " + roleName);
        }
    }
}
