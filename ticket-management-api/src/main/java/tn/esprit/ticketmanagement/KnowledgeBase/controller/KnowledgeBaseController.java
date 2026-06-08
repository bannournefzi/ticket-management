package tn.esprit.ticketmanagement.KnowledgeBase.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.KnowledgeBase.CreateKnowledgeBaseArticleRequest;
import tn.esprit.ticketmanagement.KnowledgeBase.RateArticleRequest;
import tn.esprit.ticketmanagement.KnowledgeBase.UpdateKnowledgeBaseArticleRequest;
import tn.esprit.ticketmanagement.KnowledgeBase.dto.KnowledgeBaseArticleDTO;
import tn.esprit.ticketmanagement.KnowledgeBase.service.KnowledgeBaseService;
import tn.esprit.ticketmanagement.User.entity.User;

import java.util.List;

@RestController
@RequestMapping("/knowledge-base")
@RequiredArgsConstructor
@Tag(name = "Knowledge Base", description = "Gestion de la base de connaissances")
public class KnowledgeBaseController {

    private final KnowledgeBaseService knowledgeBaseService;

    @PostMapping("/from-ticket/{ticketId}")
    @Operation(summary = "Convertir un ticket résolu en article de base de connaissances")
    public ResponseEntity<KnowledgeBaseArticleDTO> createFromTicket(
            @PathVariable Integer ticketId,
            @Valid @RequestBody CreateKnowledgeBaseArticleRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(knowledgeBaseService.createArticleFromTicket(ticketId, request, currentUser));
    }

    @GetMapping
    @Operation(summary = "Liste de tous les articles")
    public ResponseEntity<List<KnowledgeBaseArticleDTO>> getAllArticles() {
        return ResponseEntity.ok(knowledgeBaseService.getAllArticles());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détails d'un article")
    public ResponseEntity<KnowledgeBaseArticleDTO> getArticleById(@PathVariable Long id) {
        return ResponseEntity.ok(knowledgeBaseService.getArticleById(id));
    }

    @GetMapping("/search")
    @Operation(summary = "Rechercher des articles")
    public ResponseEntity<List<KnowledgeBaseArticleDTO>> searchArticles(
            @RequestParam(required = false, defaultValue = "") String query) {
        return ResponseEntity.ok(knowledgeBaseService.searchArticles(query));
    }

    @GetMapping("/category/{category}")
    @Operation(summary = "Articles par catégorie")
    public ResponseEntity<List<KnowledgeBaseArticleDTO>> getArticlesByCategory(
            @PathVariable String category) {
        return ResponseEntity.ok(knowledgeBaseService.getArticlesByCategory(category));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier un article de la base de connaissances")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BUSINESS_ANALYST')")
    public ResponseEntity<KnowledgeBaseArticleDTO> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody UpdateKnowledgeBaseArticleRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(knowledgeBaseService.updateArticle(id, request, currentUser));
    }

    @PatchMapping("/{id}/rate")
    @Operation(summary = "Évaluer un article (utile / pas utile)")
    public ResponseEntity<KnowledgeBaseArticleDTO> rateArticle(
            @PathVariable Long id,
            @Valid @RequestBody RateArticleRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(knowledgeBaseService.rateArticle(id, request, currentUser));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un article de la base de connaissances")
    @PreAuthorize("hasRole('ADMIN') or hasRole('BUSINESS_ANALYST')")
    public ResponseEntity<Void> deleteArticle(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        knowledgeBaseService.deleteArticle(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
