package tn.esprit.ticketmanagement.Ticket;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.Ticket.Ticket;
import tn.esprit.ticketmanagement.Ticket.TicketRepository;
import tn.esprit.ticketmanagement.User.entity.User;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;

    /**
     * Ajouter un commentaire à un ticket
     */
    public CommentDTO addComment(Integer ticketId, CreateCommentRequest request, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket non trouvé avec l'id: " + ticketId));

        // Un utilisateur Métier ne peut pas créer de note interne
        boolean isInternal = Boolean.TRUE.equals(request.getInternalNote());
        if (isInternal && currentUser.isUser()) {
            throw new IllegalArgumentException("Les notes internes ne sont pas disponibles pour les utilisateurs Métier");
        }

        // Vérifier si les commentaires sont désactivés pour les utilisateurs Métier
        boolean commentsEnabled = ticket.getCommentsEnabled() != null ? ticket.getCommentsEnabled() : true;
        if (!commentsEnabled && currentUser.isUser()) {
            throw new IllegalArgumentException("Les commentaires sont désactivés pour les utilisateurs Métier sur ce ticket");
        }

        Comment comment = Comment.builder()
                .content(request.getContent())
                .internalNote(isInternal)
                .author(currentUser)
                .ticket(ticket)
                .build();

        Comment saved = commentRepository.save(comment);
        return convertToDTO(saved);
    }

    /**
     * Récupérer les commentaires d'un ticket
     * - Métier : uniquement les commentaires publics
     * - BA/Admin : tous les commentaires (y compris notes internes)
     */
    public List<CommentDTO> getCommentsByTicket(Integer ticketId, User currentUser) {
        List<Comment> comments;

        if (currentUser.isUser()) {
            // Métier ne voit pas les notes internes
            comments = commentRepository.findByTicketIdAndInternalNoteFalseOrderByCreatedDateAsc(ticketId);
        } else {
            // BA et Admin voient tout
            comments = commentRepository.findByTicketIdOrderByCreatedDateAsc(ticketId);
        }

        return comments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Supprimer un commentaire (auteur ou admin uniquement)
     */
    public void deleteComment(Integer commentId, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Commentaire non trouvé"));

        if (!comment.getAuthor().getId().equals(currentUser.getId()) && !currentUser.isAdmin()) {
            throw new IllegalArgumentException("Vous ne pouvez supprimer que vos propres commentaires");
        }

        commentRepository.delete(comment);
    }

    /**
     * Nombre de commentaires pour un ticket
     */
    public long getCommentCount(Integer ticketId) {
        return commentRepository.countByTicketId(ticketId);
    }

    // ════════════════════════════════════
    // Mapper
    // ════════════════════════════════════

    private CommentDTO convertToDTO(Comment comment) {
        String role = "UTILISATEUR";
        if (comment.getAuthor().isAdmin()) role = "ADMIN";
        else if (comment.getAuthor().isIT()) role = "BUSINESS_ANALYST";
        else if (comment.getAuthor().isUser() || comment.getAuthor().isOperationnel()) role = "USER";

        return CommentDTO.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .internalNote(comment.getInternalNote())
                .authorId(comment.getAuthor().getId())
                .authorFullName(comment.getAuthor().fullName())
                .authorEmail(comment.getAuthor().getEmail())
                .authorRole(role)
                .ticketId(comment.getTicket().getId())
                .createdDate(comment.getCreatedDate())
                .build();
    }
}
