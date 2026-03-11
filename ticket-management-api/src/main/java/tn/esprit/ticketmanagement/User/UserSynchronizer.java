package tn.esprit.ticketmanagement.User;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.mapper.UserMapper;
import tn.esprit.ticketmanagement.User.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserSynchronizer {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public void synchronizeWithIdp(Jwt token) {
        log.info("Synchronizing user with idp");
        getUserEmail(token).ifPresent(userEmail -> {
            log.info("Synchronizing user having email {}", userEmail);
            Optional<User> optUser = userRepository.findByEmail(userEmail);
            User user = userMapper.fromTokenAttributes(token);

            if (optUser.isPresent()) {
                user.setId(optUser.get().getId());
            }

            userRepository.save(user);
        });
    }

    /**
     * Update user's last seen timestamp
     */
    public void updateLastSeenTimestamp(String userEmail) {
        try {
            Optional<User> optUser = userRepository.findByEmail(userEmail);
            if (optUser.isPresent()) {
                User user = optUser.get();
                user.setLastSeen(LocalDateTime.now());
                userRepository.save(user);
                log.debug("Updated last seen timestamp for user: {}", userEmail);
            }
        } catch (Exception e) {
            log.warn("Error updating last seen timestamp for user {}: {}", userEmail, e.getMessage());
        }
    }

    private Optional<String> getUserEmail(Jwt token) {
        var attributes = token.getClaims();
        if (attributes.containsKey("email")) {
            return Optional.of(attributes.get("email").toString());
        }
        return Optional.empty();
    }
}