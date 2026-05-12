package tn.esprit.ticketmanagement.meeting;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant, Integer> {
    List<MeetingParticipant> findByMeetingId(Integer meetingId);
    List<MeetingParticipant> findByUserId(Integer userId);
}