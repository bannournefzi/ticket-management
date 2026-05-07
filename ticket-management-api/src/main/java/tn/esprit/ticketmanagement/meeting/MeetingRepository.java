package tn.esprit.ticketmanagement.meeting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;


@Repository
public interface MeetingRepository extends JpaRepository<Meeting, Integer> {
    Optional<Meeting> findByMeetingCode(String code);
    List<Meeting> findByBaId(Integer baId);
    List<Meeting> findByUserId(Integer userId);
    List<Meeting> findByBaIdOrUserId(Integer baId, Integer userId);

    @Query("SELECT m FROM Meeting m WHERE m.status = :status AND m.scheduledAt BETWEEN :start AND :end")
    List<Meeting> findUpcoming(@Param("status") MeetingStatus status,
                               @Param("start") LocalDateTime start,
                               @Param("end") LocalDateTime end);
}