package tn.esprit.ticketmanagement.Ticket.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.Ticket.dto.CommentDTO;
import tn.esprit.ticketmanagement.Ticket.CreateCommentRequest;
import tn.esprit.ticketmanagement.Ticket.service.CommentService;
import tn.esprit.ticketmanagement.User.entity.User;

import java.util.List;

@RestController
@RequestMapping("/tickets/{ticketId}/comments")
@RequiredArgsConstructor
@Tag(name = "Comments")
public class CommentController {

    private final CommentService commentService;

    /**
     * Ajouter un commentaire à un ticket
     */
    @PostMapping
    public ResponseEntity<CommentDTO> addComment(
            @PathVariable Integer ticketId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        CommentDTO comment = commentService.addComment(ticketId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }

    /**
     * Recuperer les commentaires d'un ticket
     * @param source Optionnel : "INTERNAL" (discussion interne) ou "MANTIS" (discussion Mantis)
     */
    @GetMapping
    public ResponseEntity<List<CommentDTO>> getComments(
            @PathVariable Integer ticketId,
            @RequestParam(required = false) String source,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(commentService.getCommentsByTicket(ticketId, currentUser, source));
    }

    /**
     * Supprimer un commentaire
     */
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Integer ticketId,
            @PathVariable Integer commentId,
            @AuthenticationPrincipal User currentUser
    ) {
        commentService.deleteComment(commentId, currentUser);
        return ResponseEntity.noContent().build();
    }

    /**
     * Nombre de commentaires d'un ticket
     */
    @GetMapping("/count")
    public ResponseEntity<Long> getCommentCount(@PathVariable Integer ticketId) {
        return ResponseEntity.ok(commentService.getCommentCount(ticketId));
    }
}
