package tn.esprit.ticketmanagement.Ticket.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.Ticket.*;
import tn.esprit.ticketmanagement.Ticket.dto.CommentDTO;
import tn.esprit.ticketmanagement.Ticket.entity.Comment;
import tn.esprit.ticketmanagement.Ticket.entity.Ticket;
import tn.esprit.ticketmanagement.Ticket.repository.CommentRepository;
import tn.esprit.ticketmanagement.Ticket.repository.TicketRepository;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.mantis.MantisService;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentService {

    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;
    private final MantisService mantisService;


    /**
     * Ajouter un commentaire à un ticket
     */
    public CommentDTO addComment(Integer ticketId, CreateCommentRequest request, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket non trouvé avec l'id: " + ticketId));

        boolean isInternal = Boolean.TRUE.equals(request.getInternalNote());
        if (isInternal && currentUser.isUser()) {
            throw new IllegalArgumentException("Les notes internes ne sont pas disponibles pour les utilisateurs Métier");
        }

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

        // 1. Sauvegarde dans ta propre base de données
        Comment saved = commentRepository.save(comment);

        // 2. NOUVEAU : SYNCHRONISATION VERS MANTIS
        if (ticket.getMantisId() != null) {
            try {
                // On formate le message pour que les devs dans Mantis sachent qui a répondu
                String mantisFormattedNote = "Nouveau commentaire depuis la plateforme de Support.\n\n"
                        + "Auteur : " + currentUser.fullName() + "\n"
                        + "Message :\n" + request.getContent();

                mantisService.addNoteToIssue(ticket.getMantisId(), mantisFormattedNote);
            } catch (Exception e) {
                // On catch l'erreur pour ne pas bloquer l'enregistrement local si Mantis est éteint
                log.error("Impossible de pousser le commentaire vers Mantis: {}", e.getMessage());
            }
        }

        // 3. Retourne le DTO au frontend
        return convertToDTO(saved);
    }

    /**
     * Récupérer les commentaires d'un ticket
     * - Métier : uniquement les commentaires publics
     * - BA/Admin : tous les commentaires (y compris notes internes)
     */
    public List<CommentDTO> getCommentsByTicket(Integer ticketId, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket non trouvé avec l'id: " + ticketId));

        List<Comment> comments;
        if (currentUser.isUser()) {
            comments = commentRepository.findByTicketIdAndInternalNoteFalseOrderByCreatedDateAsc(ticketId);
        } else {
            comments = commentRepository.findByTicketIdOrderByCreatedDateAsc(ticketId);
        }

        // 1. On mappe les commentaires de la BDD locale
        List<CommentDTO> dtos = comments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        // 2. NOUVEAU : On récupère en LIVE les commentaires des développeurs sur Mantis
        if (ticket.getMantisId() != null) {
            List<JsonNode> mantisNotes = mantisService.getMantisNotes(ticket.getMantisId());

            for (JsonNode note : mantisNotes) {
                String text = note.path("text").asText();

                // On ignore nos propres commentaires poussés vers Mantis pour ne pas faire de doublons !
                if (text != null && text.contains("Nouveau commentaire depuis la plateforme")) {
                    continue;
                }

                // On extrait le nom du développeur Mantis
                String reporterName = note.path("reporter").path("real_name").asText();
                if (reporterName.isBlank()) {
                    reporterName = note.path("reporter").path("name").asText();
                }

                // On extrait la date de Mantis
                LocalDateTime createdDate = LocalDateTime.now();
                try {
                    String dateStr = note.path("created_at").asText();
                    // Parfois Mantis renvoie un format spécifique, on gère les ISO
                    createdDate = LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_DATE_TIME);
                } catch (Exception ignored) { }

                // On crée un CommentDTO "fictif" pour le frontend
                CommentDTO mantisDto = CommentDTO.builder()
                        .id(-note.path("id").asInt()) // ID négatif pour indiquer que c'est externe
                        .content(text)
                        .internalNote(false)
                        .authorId(0)
                        .authorFullName("Mantis Dev (" + reporterName + ")")
                        .authorRole("DEVELOPER")
                        .ticketId(ticketId)
                        .createdDate(createdDate)
                        .build();

                dtos.add(mantisDto);
            }
        }

        // 3. On trie le tout par date pour avoir une conversation logique (Local + Mantis)
        dtos.sort(Comparator.comparing(CommentDTO::getCreatedDate));

        return dtos;
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
