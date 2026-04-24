package tn.esprit.ticketmanagement.User.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.ticketmanagement.User.entity.UserSession;
import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    Optional<UserSession> findByJwtId(String jwtId);
    List<UserSession> findByUserIdAndIsValidTrueOrderByLastActivityAtDesc(Integer userId);
    List<UserSession> findByIsValidTrueOrderByLastActivityAtDesc();
}
