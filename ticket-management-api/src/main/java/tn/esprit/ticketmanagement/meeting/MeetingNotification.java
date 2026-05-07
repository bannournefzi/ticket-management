package tn.esprit.ticketmanagement.meeting;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "meeting_notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer meetingId;
    private Integer recipientId;
    private String message;
    private boolean read;
    private LocalDateTime sentAt;
}