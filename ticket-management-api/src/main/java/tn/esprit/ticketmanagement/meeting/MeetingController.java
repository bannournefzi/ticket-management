package tn.esprit.ticketmanagement.meeting;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.Notification.NotificationType;
import tn.esprit.ticketmanagement.Notification.PlatformNotificationService;
import tn.esprit.ticketmanagement.User.entity.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/meetings")
@RequiredArgsConstructor
@Tag(name = "Meetings")
public class MeetingController {

    private final MeetingService meetingService;

    // BA — Créer une réunion planifiée
    @PostMapping("/scheduled")
    public ResponseEntity<MeetingResponse> createScheduled(
            @RequestBody MeetingRequest req,
            @AuthenticationPrincipal User ba) {
        return ResponseEntity.ok(meetingService.createScheduledMeeting(req, ba.getId()));
    }

    // BA — Lancer une réunion instantanée depuis un ticket
    @PostMapping("/instant")
    public ResponseEntity<MeetingResponse> createInstant(
            @RequestParam Integer userId,
            @RequestParam Integer ticketId,
            @AuthenticationPrincipal User ba) {
        return ResponseEntity.ok(
                meetingService.createInstantMeeting(userId, ticketId, ba.getId()));
    }

    // BA ou User — Rejoindre via code
    @GetMapping("/join/{code}")
    public ResponseEntity<MeetingResponse> joinMeeting(
            @PathVariable String code,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(meetingService.joinMeeting(code, user.getId()));
    }

    // BA — Annuler
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(
            @PathVariable Integer id,
            @AuthenticationPrincipal User ba) {
        meetingService.cancelMeeting(id, ba.getId());
        return ResponseEntity.ok().build();
    }

    // Fin de réunion (appelé par le frontend quand Jitsi se ferme)
    @PatchMapping("/{id}/end")
    public ResponseEntity<Void> end(@PathVariable Integer id) {
        meetingService.endMeeting(id);
        return ResponseEntity.ok().build();
    }

    // Calendrier
    @GetMapping("/calendar")
    public ResponseEntity<List<MeetingResponse>> getCalendar(
            @AuthenticationPrincipal User user,
            @RequestParam String role) {
        return ResponseEntity.ok(meetingService.getCalendar(user.getId(), role));
    }
}