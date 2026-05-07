package tn.esprit.ticketmanagement.meeting;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserSearchController {

    private final UserRepository userRepository;

    @GetMapping("/search")
    public ResponseEntity<List<UserSearchResponse>> searchUsers(
            @RequestParam String query,
            @AuthenticationPrincipal User currentUser) {

        List<User> users = userRepository.searchByNameOrEmail(
                query.toLowerCase(), currentUser.getId());

        return ResponseEntity.ok(users.stream()
                .map(this::toResponse)
                .toList());
    }

    private UserSearchResponse toResponse(User u) {
        return UserSearchResponse.builder()
                .id(u.getId())
                .fullName(u.getFirstName() + " " + u.getLastName())
                .email(u.getEmail())
                .department(u.getDepartment())
                .role(u.getRoles().iterator().next().getName())
                .initials(getInitials(u))
                .build();
    }

    private String getInitials(User u) {
        return (u.getFirstName().charAt(0) + "" + u.getLastName().charAt(0)).toUpperCase();
    }
}
