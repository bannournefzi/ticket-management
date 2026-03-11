package tn.esprit.ticketmanagement.User.mapper;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.User.dto.UserResponse;
import tn.esprit.ticketmanagement.User.entity.User;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class UserMapper {

    public User fromTokenAttributes(Jwt token) {
        Map<String, Object> attributes = token.getClaims();
        User user = new User();
        if (attributes.containsKey("given_name")) {
            user.setFirstName(attributes.get("given_name").toString());
        } else if (attributes.containsKey("nickname")) {
            user.setFirstName(attributes.get("nickname").toString());
        }

        if (attributes.containsKey("family_name")) {
            user.setLastName(attributes.get("family_name").toString());
        }

        if (attributes.containsKey("email")) {
            user.setEmail(attributes.get("email").toString());
        }

        user.setLastSeen(LocalDateTime.now());
        return user;
    }

    public UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .lastSeen(user.getLastSeen())
                .isOnline(user.isUserOnline())
                .build();
    }
}