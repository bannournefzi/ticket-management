package tn.esprit.ticketmanagement.Ticket;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.enums.Departement;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets", description = "Gestion avancée des tickets")
public class TicketController {

    private final TicketService ticketService;

    // ══════════════════════════════════════════
    //  CRÉATION
    // ══════════════════════════════════════════

    @PostMapping(value = "/{ticketId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadAttachments(
            @PathVariable Integer ticketId,
            @RequestParam("files") MultipartFile[] files,
            @AuthenticationPrincipal User currentUser) {
        ticketService.uploadAttachments(ticketId, files, currentUser);
        return ResponseEntity.ok().build();
    }

    @PostMapping
    @Operation(summary = "Créer un nouveau ticket")
    public ResponseEntity<TicketDTO> createTicket(
            @Valid @RequestBody CreateTicketRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ticketService.createTicket(request, currentUser));
    }

    // ══════════════════════════════════════════
    //  LECTURE
    // ══════════════════════════════════════════

    @GetMapping
    @Operation(summary = "Lister tous les tickets (paginé)")
    public ResponseEntity<Page<TicketDTO>> getAllTickets(
            @PageableDefault(size = 20, sort = "createdDate",
                    direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ticketService.getAllTickets(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'un ticket")
    public ResponseEntity<TicketDTO> getTicketById(@PathVariable Integer id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }

    @GetMapping("/my-tickets")
    @Operation(summary = "Mes tickets paginés (selon mon rôle)")
    public ResponseEntity<Page<TicketDTO>> getMyTickets(
            @AuthenticationPrincipal User currentUser,
            @PageableDefault(size = 20, sort = "createdDate",
                    direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ticketService.getMyTickets(currentUser, pageable));
    }

    @GetMapping("/my-tickets/list")
    @Operation(summary = "Mes tickets en liste (compatibilité ancien frontend)")
    public ResponseEntity<List<TicketDTO>> getMyTicketsList(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ticketService.getMyTicketsAsList(currentUser));
    }

    @GetMapping("/creator/{creatorId}")
    @Operation(summary = "Tickets par créateur")
    public ResponseEntity<List<TicketDTO>> getTicketsByCreator(
            @PathVariable Integer creatorId) {
        return ResponseEntity.ok(ticketService.getTicketsByCreator(creatorId));
    }

    @GetMapping("/assignee/{assigneeId}")
    @Operation(summary = "Tickets par assigné")
    public ResponseEntity<List<TicketDTO>> getTicketsByAssignee(
            @PathVariable Integer assigneeId) {
        return ResponseEntity.ok(ticketService.getTicketsByAssignee(assigneeId));
    }

    // ══════════════════════════════════════════
    //  FILTRAGE AVANCÉ
    // ══════════════════════════════════════════

    @GetMapping("/filter")
    @Operation(summary = "Filtrage avancé avec pagination et recherche")
    public ResponseEntity<Page<TicketDTO>> filterTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) Departement departement,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer assigneeId,
            @RequestParam(required = false) Boolean unassignedOnly,
            @RequestParam(required = false) Boolean slaBreached,
            @PageableDefault(size = 20, sort = "createdDate",
                    direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ticketService.filterTickets(
                status, priority, departement, category, search,
                assigneeId, unassignedOnly, slaBreached, pageable));
    }

    @GetMapping("/filter/simple")
    @Operation(summary = "Filtrage simple (compatibilité ancien frontend)")
    public ResponseEntity<List<TicketDTO>> filterTicketsSimple(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) Departement departement) {
        return ResponseEntity.ok(
                ticketService.filterTicketsSimple(status, priority, departement));
    }

    // ══════════════════════════════════════════
    //  ASSIGNATION
    // ══════════════════════════════════════════

    @PatchMapping("/{ticketId}/assign/{assigneeId}")
    @Operation(summary = "Assigner un ticket avec audit trail")
    public ResponseEntity<TicketDTO> assignTicket(
            @PathVariable Integer ticketId,
            @PathVariable Integer assigneeId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                ticketService.assignTicket(ticketId, assigneeId, currentUser));
    }

    // ══════════════════════════════════════════
    //  CHANGEMENT DE STATUT
    // ══════════════════════════════════════════

    @PatchMapping("/{ticketId}/status")
    @Operation(summary = "Changer le statut (avec validation des transitions)")
    public ResponseEntity<TicketDTO> updateTicketStatus(
            @PathVariable Integer ticketId,
            @RequestParam TicketStatus status,
            @RequestParam(required = false) String comment,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                ticketService.updateTicketStatus(ticketId, status, currentUser, comment));
    }

    // ══════════════════════════════════════════
    //  MISE À JOUR / SUPPRESSION
    // ══════════════════════════════════════════

    @PutMapping("/{id}")
    @Operation(summary = "Modifier un ticket avec audit trail")
    public ResponseEntity<TicketDTO> updateTicket(
            @PathVariable Integer id,
            @Valid @RequestBody CreateTicketRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                ticketService.updateTicket(id, request, currentUser));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un ticket")
    public ResponseEntity<Void> deleteTicket(@PathVariable Integer id) {
        ticketService.deleteTicket(id);
        return ResponseEntity.noContent().build();
    }

    // ══════════════════════════════════════════
    //  STATISTIQUES & HISTORIQUE
    // ══════════════════════════════════════════

    @GetMapping("/stats")
    @Operation(summary = "Statistiques avancées")
    public ResponseEntity<TicketStatsDTO> getTicketStats() {
        return ResponseEntity.ok(ticketService.getTicketStats());
    }

    @GetMapping("/{ticketId}/history")
    @Operation(summary = "Historique complet d'un ticket")
    public ResponseEntity<List<TicketHistoryDTO>> getTicketHistory(
            @PathVariable Integer ticketId) {
        return ResponseEntity.ok(ticketService.getTicketHistory(ticketId));
    }

    @GetMapping("/{ticketId}/transitions")
    @Operation(summary = "Transitions de statut autorisées")
    public ResponseEntity<List<TicketStatus>> getAllowedTransitions(
            @PathVariable Integer ticketId) {
        return ResponseEntity.ok(ticketService.getAllowedTransitions(ticketId));
    }


    @PatchMapping("/{ticketId}/push-to-mantis")
    @Operation(summary = "Envoyer un ticket local vers Mantis")
    public ResponseEntity<TicketDTO> pushToMantis(
            @PathVariable Integer ticketId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ticketService.pushToMantis(ticketId, currentUser));
    }
}