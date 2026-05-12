package tn.esprit.ticketmanagement.meeting;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingRequest {
    private String title;
    private String description;
    private List<Integer> userIds;        // participant invité
    private Integer ticketId;
    private LocalDateTime scheduledAt;
    private Integer durationMinutes;
    private MeetingType type;
}
