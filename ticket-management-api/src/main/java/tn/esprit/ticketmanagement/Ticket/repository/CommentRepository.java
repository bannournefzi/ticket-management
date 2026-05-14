package tn.esprit.ticketmanagement.Ticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.esprit.ticketmanagement.Ticket.entity.Comment;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Integer> {

    List<Comment> findByTicketIdOrderByCreatedDateAsc(Integer ticketId);

    List<Comment> findByTicketIdAndInternalNoteFalseOrderByCreatedDateAsc(Integer ticketId);

    @Query("SELECT c FROM Comment c WHERE c.ticket.id = :ticketId AND (c.source = 'INTERNAL' OR c.source IS NULL) ORDER BY c.createdDate ASC")
    List<Comment> findInternalByTicketIdOrderByCreatedDateAsc(@Param("ticketId") Integer ticketId);

    @Query("SELECT c FROM Comment c WHERE c.ticket.id = :ticketId AND (c.source = 'INTERNAL' OR c.source IS NULL) AND c.internalNote = false ORDER BY c.createdDate ASC")
    List<Comment> findInternalByTicketIdAndInternalNoteFalseOrderByCreatedDateAsc(@Param("ticketId") Integer ticketId);

    @Query("SELECT c FROM Comment c WHERE c.ticket.id = :ticketId AND c.source = 'MANTIS' ORDER BY c.createdDate ASC")
    List<Comment> findMantisByTicketIdOrderByCreatedDateAsc(@Param("ticketId") Integer ticketId);

    long countByTicketId(Integer ticketId);
}
