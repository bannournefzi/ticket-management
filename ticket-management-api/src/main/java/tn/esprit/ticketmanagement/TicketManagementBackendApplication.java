package tn.esprit.ticketmanagement;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import tn.esprit.ticketmanagement.role.Role;
import tn.esprit.ticketmanagement.role.RoleRepository;

@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
public class TicketManagementBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(TicketManagementBackendApplication.class, args);
	}


	@Bean
	public CommandLineRunner runner(RoleRepository roleRepository) {
		return args -> {
			if (roleRepository.findByName("users").isEmpty()) {
				roleRepository.save(
						Role.builder().name("users").build()
				);
			}
		};
	}
}
