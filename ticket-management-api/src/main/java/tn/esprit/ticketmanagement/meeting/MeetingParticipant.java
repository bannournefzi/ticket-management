package tn.esprit.ticketmanagement.meeting;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "meeting_participants")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer meetingId;

    @Column(nullable = false)
    private Integer userId;
}