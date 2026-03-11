package tn.esprit.ticketmanagement.Ticket;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Integer> {

    List<Comment> findByTicketIdOrderByCreatedDateAsc(Integer ticketId);

    List<Comment> findByTicketIdAndInternalNoteFalseOrderByCreatedDateAsc(Integer ticketId);

    long countByTicketId(Integer ticketId);
}
