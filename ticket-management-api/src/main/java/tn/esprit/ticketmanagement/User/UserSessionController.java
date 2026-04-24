package tn.esprit.ticketmanagement.User;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.User.dto.SessionDTO;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.entity.UserSession;
import tn.esprit.ticketmanagement.User.repository.UserSessionRepository;

import java.util.List;

@RestController
@RequestMapping("/sessions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserSessionController {

    private final UserSessionRepository sessionRepository;

    @GetMapping("/my-sessions")
    public ResponseEntity<List<SessionDTO>> getMySessions(@AuthenticationPrincipal User currentUser) {
        List<UserSession> sessions;
        if (currentUser.isAdmin()) {
            sessions = sessionRepository.findByIsValidTrueOrderByLastActivityAtDesc();
        } else {
            sessions = sessionRepository.findByUserIdAndIsValidTrueOrderByLastActivityAtDesc(currentUser.getId());
        }

        List<SessionDTO> dtos = sessions.stream().map(s -> SessionDTO.builder()
                .id(s.getId())
                .ipAddress(s.getIpAddress())
                .deviceOs(s.getDeviceOs())
                .browser(s.getBrowser())
                .loginAt(s.getLoginAt())
                .lastActivityAt(s.getLastActivityAt())
                .userFullName(s.getUser() != null ? s.getUser().fullName() : "Inconnu")
                .userEmail(s.getUser() != null ? s.getUser().getEmail() : "")
                .build()
        ).toList();

        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/revoke/{sessionId}")
    public ResponseEntity<String> revokeSession(@PathVariable Long sessionId, @AuthenticationPrincipal User currentUser) {
        UserSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        // Only the owner of the session (or an admin) can revoke it
        if (!session.getUser().getId().equals(currentUser.getId()) && !currentUser.isAdmin()) {
            return ResponseEntity.status(403).body("Unauthorized to revoke this session.");
        }

        session.setValid(false);
        sessionRepository.save(session);
        return ResponseEntity.ok("Session revoked successfully. Device logged out.");
    }
}
