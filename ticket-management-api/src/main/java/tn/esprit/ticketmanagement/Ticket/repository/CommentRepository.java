package tn.esprit.ticketmanagement.Ticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.ticketmanagement.Ticket.entity.Comment;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Integer> {

    List<Comment> findByTicketIdOrderByCreatedDateAsc(Integer ticketId);

    List<Comment> findByTicketIdAndInternalNoteFalseOrderByCreatedDateAsc(Integer ticketId);

    long countByTicketId(Integer ticketId);
}
