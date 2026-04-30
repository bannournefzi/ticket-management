package tn.esprit.ticketmanagement.Ticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.ticketmanagement.Ticket.entity.TicketAttachment;

import java.util.List;

public interface TicketAttachmentRepository extends JpaRepository<TicketAttachment, Long> {
    List<TicketAttachment> findByTicketId(Integer ticketId);
}
