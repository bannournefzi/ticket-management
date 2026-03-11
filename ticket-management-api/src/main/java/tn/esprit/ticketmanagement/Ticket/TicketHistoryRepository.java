package tn.esprit.ticketmanagement.Ticket;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TicketHistoryRepository extends JpaRepository<TicketHistory, Integer> {

    List<TicketHistory> findByTicketIdOrderByChangedAtDesc(Integer ticketId);

    long countByTicketId(Integer ticketId);
}
