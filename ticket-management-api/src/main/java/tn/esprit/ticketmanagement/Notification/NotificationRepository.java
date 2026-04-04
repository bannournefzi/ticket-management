package tn.esprit.ticketmanagement.Notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Integer userId);
    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(Integer userId);
    long countByUserIdAndReadFalse(Integer userId);
}
