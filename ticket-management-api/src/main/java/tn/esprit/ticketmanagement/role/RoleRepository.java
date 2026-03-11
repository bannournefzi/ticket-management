package tn.esprit.ticketmanagement.role;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role,Integer> {

    Optional<Role> findByName(String name);
}
