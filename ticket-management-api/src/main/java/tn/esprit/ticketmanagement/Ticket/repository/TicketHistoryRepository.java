package tn.esprit.ticketmanagement.Ticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.ticketmanagement.Ticket.entity.TicketHistory;

import java.util.List;

public interface TicketHistoryRepository extends JpaRepository<TicketHistory, Integer> {

    List<TicketHistory> findByTicketIdOrderByChangedAtDesc(Integer ticketId);

    long countByTicketId(Integer ticketId);
}
