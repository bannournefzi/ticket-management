package tn.esprit.ticketmanagement.Notification;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformNotificationService {
    private final NotificationRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    // Called by event listeners
    public void createAndPush(Integer userId, NotificationType type, String title, String message, String referenceId) {
        String refType = switch (type) {
            case NEW_MESSAGE -> "MESSAGE";
            case USER_CREATED, USER_UPDATED, USER_DELETED -> "USER";
            default -> "TICKET";
        };

        Notification notification = repository.save(Notification.builder()
                .userId(userId).type(type).title(title).message(message)
                .referenceId(referenceId).referenceType(refType).build());

        // Get the user's email which is the JWT principal name used by Spring Security
        userRepository.findById(userId).ifPresent(user -> {
            log.info("📡 Pushing notification to WebSocket for user {} (email={}, type={})", userId, user.getEmail(), type);
            messagingTemplate.convertAndSendToUser(user.getEmail(), "/queue/notify", notification);
        });
    }

    // Bulk send to all users with a specific role
    public void createAndPushToRole(String roleName, NotificationType type, String title, String message, String referenceId) {
        List<User> users = userRepository.findByRoles_Name(roleName);
        log.info("📤 Sending notification to role {}: found {} users", roleName, users.size());
        users.forEach(user -> {
            log.info("  → Sending to user {} ({})", user.getId(), user.getEmail());
            createAndPush(user.getId(), type, title, message, referenceId);
        });
    }

    // REST methods
    public List<Notification> getUserNotifications(Integer userId) { return repository.findByUserIdOrderByCreatedAtDesc(userId); }
    public List<Notification> getUnreadNotifications(Integer userId) { return repository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId); }
    public long getUnreadCount(Integer userId) { return repository.countByUserIdAndReadFalse(userId); }

    @Transactional
    public void markAsRead(Integer id, Integer userId) {
        repository.findById(id).filter(n -> n.getUserId().equals(userId))
                .ifPresent(n -> { n.setRead(true); repository.save(n); });
    }

    @Transactional
    public void markAllAsRead(Integer userId) {
        repository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId)
                .forEach(n -> { n.setRead(true); });
        repository.flush();
    }

    @Transactional
    public void delete(Integer id, Integer userId) {
        repository.findById(id).filter(n -> n.getUserId().equals(userId))
                .ifPresent(repository::delete);
    }
}
