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
import tn.esprit.ticketmanagement.Audit.entity.AuditLog;
import tn.esprit.ticketmanagement.Audit.service.AuditLogService;
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
    private final AuditLogService auditLogService;

    // ══════════════════════════════════════════
    // Constants
    // ══════════════════════════════════════════

    public static final String SOURCE_INTERNAL = "INTERNAL";
    public static final String SOURCE_MANTIS   = "MANTIS";

    // ══════════════════════════════════════════
    // Ajouter un commentaire
    // ══════════════════════════════════════════

    public CommentDTO addComment(Integer ticketId, CreateCommentRequest request, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket non trouvé avec l'id: " + ticketId));

        boolean isInternal = Boolean.TRUE.equals(request.getInternalNote());
        if (isInternal && currentUser.isUser()) {
            throw new IllegalArgumentException("Les notes internes ne sont pas disponibles pour les utilisateurs Métier");
        }

        // Source validation
        String source = request.getSource() != null ? request.getSource() : SOURCE_INTERNAL;
        if (SOURCE_MANTIS.equals(source) && currentUser.isUser()) {
            throw new IllegalArgumentException("Les commentaires Mantis ne sont pas disponibles pour les utilisateurs Métier");
        }

        boolean commentsEnabled = ticket.getCommentsEnabled() != null ? ticket.getCommentsEnabled() : true;
        if (!commentsEnabled && currentUser.isUser()) {
            throw new IllegalArgumentException("Les commentaires sont désactivés pour les utilisateurs Métier sur ce ticket");
        }

        Comment comment = Comment.builder()
                .content(request.getContent())
                .internalNote(isInternal)
                .source(source)
                .author(currentUser)
                .ticket(ticket)
                .build();

        Comment saved = commentRepository.save(comment);

        // Sync to Mantis ONLY if source is "MANTIS" and ticket has a mantisId
        if (SOURCE_MANTIS.equals(source) && ticket.getMantisId() != null) {
            try {
                String mantisFormattedNote = "Nouveau commentaire depuis la plateforme de Support.\n\n"
                        + "Auteur : " + currentUser.fullName() + "\n"
                        + "Message :\n" + request.getContent();

                mantisService.addNoteToIssue(ticket.getMantisId(), mantisFormattedNote);
                log.info("Commentaire source=MANTIS synchronisé vers Mantis #{}", ticket.getMantisId());
            } catch (Exception e) {
                log.error("Impossible de synchroniser le commentaire MANTIS vers Mantis #{}: {}",
                        ticket.getMantisId(), e.getMessage());
            }
        } else if (SOURCE_INTERNAL.equals(source)) {
            log.debug("Commentaire source=INTERNAL — non synchronisé vers Mantis");
        }

        auditLogService.log(currentUser.getId(), currentUser.fullName(), AuditLog.ACTION_CREATE_COMMENT,
                "Ticket", "Comment", saved.getId().longValue(),
                "Commentaire ajouté au ticket #" + ticketId + " par " + currentUser.fullName());
        return convertToDTO(saved);
    }

    // ══════════════════════════════════════════
    // Recuperer les commentaires d'un ticket
    // ══════════════════════════════════════════

    public List<CommentDTO> getCommentsByTicket(Integer ticketId, User currentUser) {
        return getCommentsByTicket(ticketId, currentUser, null);
    }

    public List<CommentDTO> getCommentsByTicket(Integer ticketId, User currentUser, String source) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket non trouvé avec l'id: " + ticketId));

        // Metier users can ONLY see internal comments
        if (currentUser.isUser()) {
            source = SOURCE_INTERNAL;
        }

        List<CommentDTO> dtos;

        if (SOURCE_INTERNAL.equals(source)) {
            // Internal discussion: includes legacy comments (source IS NULL)
            List<Comment> comments;
            if (currentUser.isUser()) {
                comments = commentRepository.findInternalByTicketIdAndInternalNoteFalseOrderByCreatedDateAsc(ticketId);
            } else {
                comments = commentRepository.findInternalByTicketIdOrderByCreatedDateAsc(ticketId);
            }
            dtos = comments.stream().map(this::convertToDTO).collect(Collectors.toList());

        } else if (SOURCE_MANTIS.equals(source)) {
            // Mantis discussion: BA/Admin only — local MANTIS comments + live Mantis notes
            if (currentUser.isUser()) {
                return List.of();
            }
            List<Comment> mantisComments = commentRepository.findMantisByTicketIdOrderByCreatedDateAsc(ticketId);
            dtos = mantisComments.stream().map(this::convertToDTO).collect(Collectors.toList());

            // Fetch LIVE Mantis developer notes
            if (ticket.getMantisId() != null) {
                List<JsonNode> mantisNotes = mantisService.getMantisNotes(ticket.getMantisId());
                for (JsonNode note : mantisNotes) {
                    String text = note.path("text").asText();

                    // Skip self-synced comments (those pushed from our platform)
                    if (text != null && text.contains("Nouveau commentaire depuis la plateforme")) {
                        continue;
                    }

                    String reporterName = note.path("reporter").path("real_name").asText();
                    if (reporterName.isBlank()) {
                        reporterName = note.path("reporter").path("name").asText();
                    }

                    LocalDateTime createdDate = LocalDateTime.now();
                    try {
                        String dateStr = note.path("created_at").asText();
                        createdDate = LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_DATE_TIME);
                    } catch (Exception ignored) {}

                    CommentDTO mantisDto = CommentDTO.builder()
                            .id(-note.path("id").asInt())
                            .content(text)
                            .internalNote(false)
                            .source(SOURCE_MANTIS)
                            .authorId(0)
                            .authorFullName("Mantis Dev (" + reporterName + ")")
                            .authorRole("DEVELOPER")
                            .ticketId(ticketId)
                            .createdDate(createdDate)
                            .build();

                    dtos.add(mantisDto);
                }
            }

            dtos.sort(Comparator.comparing(CommentDTO::getCreatedDate));

        } else {
            // No source filter: backward-compatible — all comments (old behavior)
            List<Comment> comments;
            if (currentUser.isUser()) {
                comments = commentRepository.findByTicketIdAndInternalNoteFalseOrderByCreatedDateAsc(ticketId);
            } else {
                comments = commentRepository.findByTicketIdOrderByCreatedDateAsc(ticketId);
            }
            dtos = comments.stream().map(this::convertToDTO).collect(Collectors.toList());

            // Include Mantis notes for BA/Admin (backward compat)
            if (ticket.getMantisId() != null && !currentUser.isUser()) {
                List<JsonNode> mantisNotes = mantisService.getMantisNotes(ticket.getMantisId());
                for (JsonNode note : mantisNotes) {
                    String text = note.path("text").asText();
                    if (text != null && text.contains("Nouveau commentaire depuis la plateforme")) continue;

                    String reporterName = note.path("reporter").path("real_name").asText();
                    if (reporterName.isBlank()) reporterName = note.path("reporter").path("name").asText();

                    LocalDateTime createdDate = LocalDateTime.now();
                    try {
                        createdDate = LocalDateTime.parse(note.path("created_at").asText(), DateTimeFormatter.ISO_DATE_TIME);
                    } catch (Exception ignored) {}

                    CommentDTO mantisDto = CommentDTO.builder()
                            .id(-note.path("id").asInt())
                            .content(text)
                            .internalNote(false)
                            .source(SOURCE_MANTIS)
                            .authorId(0)
                            .authorFullName("Mantis Dev (" + reporterName + ")")
                            .authorRole("DEVELOPER")
                            .ticketId(ticketId)
                            .createdDate(createdDate)
                            .build();
                    dtos.add(mantisDto);
                }
                dtos.sort(Comparator.comparing(CommentDTO::getCreatedDate));
            }
        }

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

        auditLogService.log(currentUser.getId(), currentUser.fullName(), AuditLog.ACTION_DELETE_COMMENT,
                "Ticket", "Comment", commentId.longValue(),
                "Commentaire #" + commentId + " supprimé du ticket #" + comment.getTicket().getId());
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

        String src = comment.getSource() != null ? comment.getSource() : SOURCE_INTERNAL;

        return CommentDTO.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .internalNote(comment.getInternalNote())
                .source(src)
                .authorId(comment.getAuthor().getId())
                .authorFullName(comment.getAuthor().fullName())
                .authorEmail(comment.getAuthor().getEmail())
                .authorRole(role)
                .ticketId(comment.getTicket().getId())
                .createdDate(comment.getCreatedDate())
                .build();
    }
}
