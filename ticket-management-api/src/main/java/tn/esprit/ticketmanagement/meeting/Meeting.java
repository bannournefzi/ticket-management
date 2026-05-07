package tn.esprit.ticketmanagement.meeting;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "meetings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Meeting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String meetingCode;          // UUID court ex: "a1b2c3d4"

    private String title;
    private String description;

    private Integer baId;
    private Integer userId;
    private Integer ticketId;

    private LocalDateTime scheduledAt;
    private Integer durationMinutes;     // durée prévue

    @Enumerated(EnumType.STRING)
    private MeetingStatus status;        // PENDING, ACTIVE, COMPLETED, CANCELLED

    @Enumerated(EnumType.STRING)
    private MeetingType type;            // INSTANT, SCHEDULED

    private String jitsiRoomUrl;         // meet.jit.si/{code}
    private LocalDateTime endedAt;
}

