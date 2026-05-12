package tn.esprit.ticketmanagement.meeting;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MeetingResponse {
    private Integer id;
    private String meetingCode;
    private String title;
    private String description;
    private String jitsiRoomUrl;
    private MeetingStatus status;
    private MeetingType type;
    private LocalDateTime scheduledAt;
    private Integer durationMinutes;
    private Integer baId;
    private List<Integer> userIds;
    private Integer ticketId;
}