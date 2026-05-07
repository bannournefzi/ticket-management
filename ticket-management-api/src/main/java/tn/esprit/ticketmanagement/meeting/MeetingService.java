package tn.esprit.ticketmanagement.meeting;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.Notification.NotificationType;
import tn.esprit.ticketmanagement.Notification.PlatformNotificationService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final PlatformNotificationService notificationService;

    private static final String JITSI_BASE = "https://meet.jit.si/";

    public MeetingResponse createScheduledMeeting(MeetingRequest req, Integer baId) {
        String code = generateCode();
        String jitsiUrl = JITSI_BASE + "itsm-" + code;

        Meeting meeting = Meeting.builder()
                .meetingCode(code)
                .title(req.getTitle())
                .description(req.getDescription())
                .baId(baId)
                .userId(req.getUserId())
                .ticketId(req.getTicketId())
                .scheduledAt(req.getScheduledAt())
                .durationMinutes(req.getDurationMinutes())
                .type(MeetingType.SCHEDULED)
                .status(MeetingStatus.PENDING)
                .jitsiRoomUrl(jitsiUrl)
                .build();

        meetingRepository.save(meeting);
        sendInvitationNotification(meeting);
        return toResponse(meeting);
    }

    public MeetingResponse createInstantMeeting(Integer userId, Integer ticketId, Integer baId) {
        String code = generateCode();
        Meeting meeting = Meeting.builder()
                .meetingCode(code)
                .title("Ticket #" + ticketId + " — Support rapide")
                .baId(baId)
                .userId(userId)
                .ticketId(ticketId)
                .scheduledAt(LocalDateTime.now())
                .type(MeetingType.INSTANT)
                .status(MeetingStatus.ACTIVE)
                .jitsiRoomUrl(JITSI_BASE + "itsm-" + code)
                .build();

        meetingRepository.save(meeting);
        sendInstantCallNotification(meeting);
        return toResponse(meeting);
    }

    public MeetingResponse joinMeeting(String code, Integer userId) {
        Meeting meeting = meetingRepository.findByMeetingCode(code.trim()) // ← trim()

                .orElseThrow(() -> new RuntimeException("Code invalide"));

        if (meeting.getStatus() == MeetingStatus.CANCELLED) {
            throw new RuntimeException("Cette réunion a été annulée");
        }

        meeting.setStatus(MeetingStatus.ACTIVE);
        meetingRepository.save(meeting);
        return toResponse(meeting);
    }

    public void cancelMeeting(Integer meetingId, Integer baId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Réunion introuvable"));

        if (!meeting.getBaId().equals(baId)) {
            throw new RuntimeException("Non autorisé");
        }

        meeting.setStatus(MeetingStatus.CANCELLED);
        meetingRepository.save(meeting);

        notificationService.createAndPush(
                meeting.getUserId(),
                NotificationType.NEW_MESSAGE,
                "Réunion annulée",
                "La réunion \"" + meeting.getTitle() + "\" a été annulée.",
                null
        );
    }

    public void endMeeting(Integer meetingId) {
        meetingRepository.findById(meetingId).ifPresent(m -> {
            m.setStatus(MeetingStatus.COMPLETED);
            m.setEndedAt(LocalDateTime.now());
            meetingRepository.save(m);
        });
    }

    public List<MeetingResponse> getCalendar(Integer userId, String role) {
        List<Meeting> meetings = "BA".equals(role)
                ? meetingRepository.findByBaId(userId)
                : meetingRepository.findByUserId(userId);
        return meetings.stream().map(this::toResponse).toList();
    }

    // — helpers —
    private String generateCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private void sendInvitationNotification(Meeting meeting) {
        String msg = "📅 Réunion planifiée : \"" + meeting.getTitle()
                + "\" — Code : " + meeting.getMeetingCode();
        notificationService.createAndPush(
                meeting.getUserId(), NotificationType.NEW_MESSAGE,
                "Invitation réunion", msg, meeting.getMeetingCode());
    }

    private void sendInstantCallNotification(Meeting meeting) {
        String msg = "📞 Appel vidéo en cours ! Code : " + meeting.getMeetingCode();
        notificationService.createAndPush(
                meeting.getUserId(), NotificationType.NEW_MESSAGE,
                "Appel vidéo 🎥", msg, meeting.getMeetingCode());
    }

    private MeetingResponse toResponse(Meeting m) {
        return MeetingResponse.builder()
                .id(m.getId()).meetingCode(m.getMeetingCode())
                .title(m.getTitle()).description(m.getDescription())
                .jitsiRoomUrl(m.getJitsiRoomUrl()).status(m.getStatus())
                .type(m.getType()).scheduledAt(m.getScheduledAt())
                .durationMinutes(m.getDurationMinutes())
                .baId(m.getBaId()).userId(m.getUserId()).ticketId(m.getTicketId())
                .build();
    }
}