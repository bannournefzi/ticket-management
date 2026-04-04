package tn.esprit.ticketmanagement.Ticket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tn.esprit.ticketmanagement.Ticket.exception.InvalidStatusTransitionException;
import tn.esprit.ticketmanagement.Ticket.exception.TicketNotFoundException;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.enums.Departement;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.mantis.MantisProperties;
import tn.esprit.ticketmanagement.mantis.MantisService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TicketService {

    private final TicketAttachmentRepository ticketAttachmentRepository;

    private final TicketRepository ticketRepository;
    private final TicketHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final MantisService mantisService;
    private final MantisProperties mantisProperties;
    @PersistenceContext
    private EntityManager em;


    // ══════════════════════════════════════════
    //  CRÉATION
    // ══════════════════════════════════════════

    public TicketDTO createTicket(CreateTicketRequest request, User currentUser) {
        boolean isMetier = currentUser.isMetier();

        Ticket ticket = Ticket.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .priority(request.getPriority())
                .status(TicketStatus.NEW)
                .category(request.getCategory())
                .departement(isMetier
                        ? currentUser.getDepartement()
                        : (request.getDepartement() != null
                        ? request.getDepartement()
                        : currentUser.getDepartement()))
                .creator(currentUser)
                .tags(request.getTags() != null ? request.getTags() : List.of())
                .build();

        if (!isMetier && request.getAssignedToId() != null) {
            User assignee = findAssigneeOrThrow(request.getAssignedToId());
            ticket.setAssignedTo(assignee);
            ticket.setStatus(TicketStatus.ASSIGNED);
            ticket.setFirstResponseAt(LocalDateTime.now());
        }

        // ✅ Save locally only (NO automatic push to Mantis)
        Ticket saved = ticketRepository.save(ticket);

        recordHistory(saved, null, saved.getStatus(), "status",
                null, saved.getStatus().name(), "Ticket créé", currentUser);

        eventPublisher.publishEvent(new TicketEvents.TicketCreatedEvent(this, saved));
        log.info("Ticket #{} créé par {} [{}] (local only, not pushed to Mantis)",
                saved.getId(), currentUser.fullName(), saved.getPriority());

        return convertToDTO(saved);
    }
    // ══════════════════════════════════════════
    //  LECTURE — PAGINÉE
    // ══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<TicketDTO> getAllTickets(Pageable pageable) {
        return ticketRepository.findAll(pageable).map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public TicketDTO getTicketById(Integer id) {
        return convertToDTO(findTicketOrThrow(id));
    }

    @Transactional(readOnly = true)
    public Page<TicketDTO> getMyTickets(User currentUser, Pageable pageable) {
        if (currentUser.isMetier()) {
            // Métier sees only their own tickets
            return ticketRepository.findByCreatorId(currentUser.getId(), pageable)
                    .map(this::convertToDTO);
        } else {
            // BA / Admin / IT see all tickets
            return ticketRepository.findAll(pageable).map(this::convertToDTO);
        }
    }

    // ══════════════════════════════════════════
    //  LECTURE — LISTE (frontend kanban)
    //
    //  FIX: Business Analyst now sees ALL tickets
    //  submitted by Métier users (all statuses).
    //  Métier users still see only their own tickets.
    //  Admins see everything.
    // ══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<TicketDTO> getMyTicketsAsList(User currentUser) {
        List<Ticket> tickets;

        if (currentUser.isMetier()) {
            // Métier: only tickets they created
            tickets = ticketRepository.findByCreatorId(currentUser.getId());
            log.info("Métier {} fetching their own {} tickets",
                    currentUser.fullName(), tickets.size());

        } else if (currentUser.isIT()) {
            // ✅ FIX: BA sees ALL tickets from ALL Métier users, all statuses
            tickets = ticketRepository.findAll();
            log.info("Business Analyst {} fetching all {} tickets",
                    currentUser.fullName(), tickets.size());

        } else {
            // Admin / other roles: see everything
            tickets = ticketRepository.findAll();
            log.info("Admin/Other {} fetching all {} tickets",
                    currentUser.fullName(), tickets.size());
        }

        return tickets.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketDTO> getTicketsByCreator(Integer creatorId) {
        return ticketRepository.findByCreatorId(creatorId)
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketDTO> getTicketsByAssignee(Integer assigneeId) {
        return ticketRepository.findByAssignedToId(assigneeId)
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    // ══════════════════════════════════════════
    //  FILTRAGE AVANCÉ (JPA Specification)
    // ══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<TicketDTO> filterTickets(TicketStatus status, TicketPriority priority,
                                         Departement departement, TicketCategory category,
                                         String search, Integer assigneeId,
                                         Boolean unassignedOnly, Boolean slaBreached,
                                         Pageable pageable) {

        Specification<Ticket> spec = Specification.allOf();
        spec = spec.and(TicketSpecification.hasStatus(status));
        spec = spec.and(TicketSpecification.hasPriority(priority));
        spec = spec.and(TicketSpecification.hasDepartement(departement));
        spec = spec.and(TicketSpecification.hasCategory(category));
        spec = spec.and(TicketSpecification.searchText(search));
        spec = spec.and(TicketSpecification.hasAssignee(assigneeId));

        if (Boolean.TRUE.equals(unassignedOnly)) {
            spec = spec.and(TicketSpecification.isUnassigned());
        }
        if (Boolean.TRUE.equals(slaBreached)) {
            spec = spec.and(TicketSpecification.isSLABreached());
        }

        return ticketRepository.findAll(spec, pageable).map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<TicketDTO> filterTicketsSimple(TicketStatus status, TicketPriority priority,
                                               Departement departement) {
        Specification<Ticket> spec = Specification.allOf();
        spec = spec.and(TicketSpecification.hasStatus(status));
        spec = spec.and(TicketSpecification.hasPriority(priority));
        spec = spec.and(TicketSpecification.hasDepartement(departement));

        return ticketRepository.findAll(spec).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // ══════════════════════════════════════════
    //  ASSIGNATION
    // ══════════════════════════════════════════

    public TicketDTO assignTicket(Integer ticketId, Integer assigneeId, User currentUser) {
        Ticket ticket = findTicketOrThrow(ticketId);
        User assignee = findAssigneeOrThrow(assigneeId);

        String oldAssignee = ticket.getAssignedTo() != null
                ? ticket.getAssignedTo().fullName() : "Non assigné";

        ticket.setAssignedTo(assignee);

        if (ticket.getFirstResponseAt() == null) {
            ticket.setFirstResponseAt(LocalDateTime.now());
        }

        if (ticket.getStatus() == TicketStatus.NEW) {
            recordHistory(ticket, TicketStatus.NEW, TicketStatus.ASSIGNED,
                    "status", "OPEN", "IN_PROGRESS",
                    "Auto-transition lors de l'assignation", currentUser);
            ticket.setStatus(TicketStatus.ASSIGNED);
        }

        recordHistory(ticket, null, null, "assignee",
                oldAssignee, assignee.fullName(),
                "Ticket assigné à " + assignee.fullName(), currentUser);

        Ticket saved = ticketRepository.save(ticket);

        eventPublisher.publishEvent(new TicketEvents.TicketAssignedEvent(this, saved, assignee));

        log.info("Ticket #{} assigné à {} par {}",
                ticketId, assignee.fullName(), currentUser.fullName());

        return convertToDTO(saved);
    }

    public TicketDTO assignTicket(Integer ticketId, Integer assigneeId) {
        Ticket ticket = findTicketOrThrow(ticketId);
        User assignee = findAssigneeOrThrow(assigneeId);

        ticket.setAssignedTo(assignee);
        if (ticket.getFirstResponseAt() == null) {
            ticket.setFirstResponseAt(LocalDateTime.now());
        }
        if (ticket.getStatus() == TicketStatus.NEW) {
            ticket.setStatus(TicketStatus.ASSIGNED);
        }

        return convertToDTO(ticketRepository.save(ticket));
    }

    // ══════════════════════════════════════════
    //  CHANGEMENT DE STATUT
    // ══════════════════════════════════════════

    public TicketDTO updateTicketStatus(Integer ticketId, TicketStatus newStatus,
                                        User currentUser, String comment) {
        Ticket ticket = findTicketOrThrow(ticketId);
        TicketStatus oldStatus = ticket.getStatus();

        if (!oldStatus.canTransitionTo(newStatus)) {
            throw new InvalidStatusTransitionException(oldStatus, newStatus);
        }

        ticket.setStatus(newStatus);

        if (newStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedDate(LocalDateTime.now());
        } else if (newStatus == TicketStatus.CLOSED) {
            ticket.setClosedDate(LocalDateTime.now());
            if (ticket.getResolvedDate() == null) {
                ticket.setResolvedDate(LocalDateTime.now());
            }
        } else if (newStatus == TicketStatus.ASSIGNED && oldStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedDate(null);
            ticket.setClosedDate(null);
        }

        recordHistory(ticket, oldStatus, newStatus, "status",
                oldStatus.name(), newStatus.name(), comment, currentUser);

        Ticket saved = ticketRepository.save(ticket);

        eventPublisher.publishEvent(
                new TicketEvents.TicketStatusChangedEvent(this, saved, oldStatus, newStatus));

        log.info("Ticket #{} : {} → {} par {}",
                ticketId, oldStatus, newStatus, currentUser.fullName());

        return convertToDTO(saved);
    }

    public TicketDTO updateTicketStatus(Integer ticketId, TicketStatus newStatus) {
        Ticket ticket = findTicketOrThrow(ticketId);
        TicketStatus oldStatus = ticket.getStatus();

        if (!oldStatus.canTransitionTo(newStatus)) {
            throw new InvalidStatusTransitionException(oldStatus, newStatus);
        }

        ticket.setStatus(newStatus);
        if (newStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedDate(LocalDateTime.now());
        } else if (newStatus == TicketStatus.CLOSED) {
            ticket.setClosedDate(LocalDateTime.now());
        }

        return convertToDTO(ticketRepository.save(ticket));
    }

    // ══════════════════════════════════════════
    //  MISE À JOUR
    // ══════════════════════════════════════════

    public TicketDTO updateTicket(Integer ticketId, CreateTicketRequest request, User currentUser) {
        Ticket ticket = findTicketOrThrow(ticketId);

        if (!ticket.getTitle().equals(request.getTitle())) {
            recordHistory(ticket, null, null, "title",
                    ticket.getTitle(), request.getTitle(), null, currentUser);
        }
        if (ticket.getPriority() != request.getPriority()) {
            recordHistory(ticket, null, null, "priority",
                    ticket.getPriority().name(), request.getPriority().name(), null, currentUser);
            ticket.setDueDate(SLAConfig.calculateDueDate(
                    request.getPriority(), ticket.getCreatedDate()));
        }

        ticket.setTitle(request.getTitle().trim());
        ticket.setDescription(request.getDescription().trim());
        ticket.setPriority(request.getPriority());
        ticket.setCategory(request.getCategory());

        if (request.getDepartement() != null) {
            ticket.setDepartement(request.getDepartement());
        }
        if (request.getTags() != null) {
            ticket.setTags(request.getTags());
        }

        return convertToDTO(ticketRepository.save(ticket));
    }

    public TicketDTO updateTicket(Integer ticketId, CreateTicketRequest request) {
        Ticket ticket = findTicketOrThrow(ticketId);

        ticket.setTitle(request.getTitle());
        ticket.setDescription(request.getDescription());
        ticket.setPriority(request.getPriority());
        ticket.setCategory(request.getCategory());
        if (request.getDepartement() != null) {
            ticket.setDepartement(request.getDepartement());
        }

        return convertToDTO(ticketRepository.save(ticket));
    }

    // ══════════════════════════════════════════
    //  SUPPRESSION
    // ══════════════════════════════════════════

    public void deleteTicket(Integer ticketId) {
        if (!ticketRepository.existsById(ticketId)) {
            throw new TicketNotFoundException(ticketId);
        }
        ticketRepository.deleteById(ticketId);
        log.info("Ticket #{} supprimé", ticketId);
    }

    // ══════════════════════════════════════════
    //  HISTORIQUE
    // ══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<TicketHistoryDTO> getTicketHistory(Integer ticketId) {
        findTicketOrThrow(ticketId);
        return historyRepository.findByTicketIdOrderByChangedAtDesc(ticketId)
                .stream()
                .map(this::convertHistoryToDTO)
                .collect(Collectors.toList());
    }

    // ══════════════════════════════════════════
    //  STATISTIQUES
    // ══════════════════════════════════════════

    @Transactional(readOnly = true)
    public TicketStatsDTO getTicketStats() {
        LocalDateTime last7Days = LocalDateTime.now().minusDays(7);
        LocalDateTime last30Days = LocalDateTime.now().minusDays(30);

        double avgResolutionHours = calculateAverageResolutionTime();

        Map<String, Long> departementStats = ticketRepository.countByDepartementGrouped()
                .stream()
                .collect(Collectors.toMap(
                        row -> row[0].toString(),
                        row -> (Long) row[1]
                ));

        Map<String, Long> categoryStats = ticketRepository.countByCategoryGrouped()
                .stream()
                .collect(Collectors.toMap(
                        row -> row[0].toString(),
                        row -> (Long) row[1]
                ));

        long slaBreachedCount = ticketRepository
                .findSLABreachedTickets(LocalDateTime.now()).size();

        return TicketStatsDTO.builder()
                .totalTickets(ticketRepository.count())
                .newTickets(ticketRepository.countByStatus(TicketStatus.NEW))
                .feedbackTickets(ticketRepository.countByStatus(TicketStatus.FEEDBACK))
                .acknowledgedTickets(ticketRepository.countByStatus(TicketStatus.ACKNOWLEDGED))
                .confirmedTickets(ticketRepository.countByStatus(TicketStatus.CONFIRMED))
                .assignedTickets(ticketRepository.countByStatus(TicketStatus.ASSIGNED))
                .resolvedTickets(ticketRepository.countByStatus(TicketStatus.RESOLVED))
                .closedTickets(ticketRepository.countByStatus(TicketStatus.CLOSED))
                .lowPriority(ticketRepository.countByPriority(TicketPriority.LOW))
                .mediumPriority(ticketRepository.countByPriority(TicketPriority.MEDIUM))
                .highPriority(ticketRepository.countByPriority(TicketPriority.HIGH))
                .criticalPriority(ticketRepository.countByPriority(TicketPriority.CRITICAL))
                .averageResolutionTimeHours(avgResolutionHours)
                .ticketsCreatedLast7Days(ticketRepository.countCreatedSince(last7Days))
                .ticketsResolvedLast7Days(ticketRepository.countResolvedSince(last7Days))
                .ticketsCreatedLast30Days(ticketRepository.countCreatedSince(last30Days))
                .ticketsResolvedLast30Days(ticketRepository.countResolvedSince(last30Days))
                .slaBreachedTickets(slaBreachedCount)
                .unassignedTickets(ticketRepository.findUnassignedNewTickets().size())
                .ticketsByDepartement(departementStats)
                .ticketsByCategory(categoryStats)
                .build();
    }

    // ══════════════════════════════════════════
    //  TRANSITIONS POSSIBLES
    // ══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<TicketStatus> getAllowedTransitions(Integer ticketId) {
        Ticket ticket = findTicketOrThrow(ticketId);
        return ticket.getStatus().getAllowedTransitions().stream().toList();
    }

    // ══════════════════════════════════════════
    //  HELPERS PRIVÉS
    // ══════════════════════════════════════════

    private Ticket findTicketOrThrow(Integer id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));
    }

    private User findAssigneeOrThrow(Integer assigneeId) {
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
        if (!assignee.isIT()) {
            throw new IllegalArgumentException(
                    "L'utilisateur assigné doit avoir le rôle BUSINESS_ANALYST");
        }
        return assignee;
    }

    private void recordHistory(Ticket ticket, TicketStatus oldStatus, TicketStatus newStatus,
                               String field, String oldValue, String newValue,
                               String comment, User changedBy) {
        TicketHistory history = TicketHistory.builder()
                .ticket(ticket)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .fieldChanged(field)
                .oldValue(oldValue)
                .newValue(newValue)
                .comment(comment)
                .changedBy(changedBy)
                .changedAt(LocalDateTime.now())
                .build();
        historyRepository.save(history);
    }

    private double calculateAverageResolutionTime() {
        List<Object[]> dates = ticketRepository.findResolvedTicketDates();
        if (dates.isEmpty()) return 0.0;

        double totalHours = 0;
        for (Object[] row : dates) {
            LocalDateTime created = (LocalDateTime) row[0];
            LocalDateTime resolved = (LocalDateTime) row[1];
            totalHours += Duration.between(created, resolved).toHours();
        }
        return totalHours / dates.size();
    }

    // ══════════════════════════════════════════
    //  MAPPERS
    // ══════════════════════════════════════════

    private TicketDTO convertToDTO(Ticket ticket) {
        TicketDTO.TicketDTOBuilder builder = TicketDTO.builder()
                .id(ticket.getId())
                .title(ticket.getTitle())
                .description(ticket.getDescription())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .category(ticket.getCategory())
                .departement(ticket.getDepartement())
                .creatorId(ticket.getCreator().getId())
                .creatorFullName(ticket.getCreator().fullName())
                .creatorEmail(ticket.getCreator().getEmail())
                .createdDate(ticket.getCreatedDate())
                .lastModifiedDate(ticket.getLastModifiedDate())
                .resolvedDate(ticket.getResolvedDate())
                .closedDate(ticket.getClosedDate())
                .dueDate(ticket.getDueDate())
                .slaStatus(ticket.getSLAStatus() != null ? ticket.getSLAStatus().name() : null)
                .tags(ticket.getTags())
                .commentCount(ticket.getComments() != null ? ticket.getComments().size() : 0)
                .allowedTransitions(ticket.getStatus().getAllowedTransitions().stream().toList())
                .mantisId(ticket.getMantisId())
                .mantisProjectId(ticket.getMantisProjectId());

        if (ticket.getAssignedTo() != null) {
            builder.assignedToId(ticket.getAssignedTo().getId())
                    .assignedToFullName(ticket.getAssignedTo().fullName())
                    .assignedToEmail(ticket.getAssignedTo().getEmail());
        }

        return builder.build();
    }

    private TicketHistoryDTO convertHistoryToDTO(TicketHistory h) {
        return TicketHistoryDTO.builder()
                .id(h.getId())
                .ticketId(h.getTicket().getId())
                .fieldChanged(h.getFieldChanged())
                .oldValue(h.getOldValue())
                .newValue(h.getNewValue())
                .comment(h.getComment())
                .changedByFullName(h.getChangedBy() != null
                        ? h.getChangedBy().fullName() : "Système")
                .changedAt(h.getChangedAt())
                .build();
    }

    public TicketDTO pushToMantis(Integer ticketId, User currentUser) {
        Ticket ticket = findTicketOrThrow(ticketId);

        Long mantisId = ticket.getMantisId();
        if (mantisId == null) {
            mantisId = mantisService.createIssue(ticket.getTitle(), ticket.getDescription());
            ticket.setMantisId(mantisId);
            ticket.setMantisProjectId(mantisProperties.getProjectId());

            recordHistory(ticket, null, null, "mantis",
                    null, String.valueOf(mantisId),
                    "Ticket envoyé vers Mantis", currentUser);
        }

        List<TicketAttachment> atts = ticketAttachmentRepository.findByTicketId(ticket.getId());
        log.info("Mantis push ticket {} -> {} attachments", ticket.getId(), atts.size());

        for (TicketAttachment a : atts) {
            try {
                mantisService.uploadIssueAttachment(
                        mantisId,
                        a.getFileName(),
                        a.getContentType(),
                        a.getFileData()
                );
                log.info("Uploaded attachment '{}' to Mantis #{}", a.getFileName(), mantisId);
            } catch (Exception e) {
                log.error("Failed upload '{}' to Mantis #{}: {}", a.getFileName(), mantisId, e.getMessage(), e);
            }
        }

        Ticket saved = ticketRepository.save(ticket);
        return convertToDTO(saved);
    }

    @Transactional
    public void uploadAttachments(Integer ticketId, MultipartFile[] files, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket introuvable"));

        if (files == null || files.length == 0) return;

        final long MAX_SIZE = 2_147_328L; // 2,097 KB

        List<TicketAttachment> batch = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;

            if (file.getSize() > MAX_SIZE) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Le fichier " + file.getOriginalFilename() + " dépasse 2,097 KB");
            }

            try {
                String originalName = file.getOriginalFilename();
                String safeName = (originalName == null || originalName.trim().isEmpty())
                        ? "attachment-" + System.currentTimeMillis()
                        : originalName.trim();

                String safeContentType = (file.getContentType() == null || file.getContentType().isBlank())
                        ? "application/octet-stream"
                        : file.getContentType();

                batch.add(TicketAttachment.builder()
                        .ticket(ticket)
                        .fileName(safeName)
                        .contentType(safeContentType)
                        .sizeBytes(file.getSize())
                        .fileData(file.getBytes())
                        .uploadedAt(LocalDateTime.now())
                        .build());

            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur lecture fichier", e);
            }
        }

        try {
            for (TicketAttachment a : batch) {
                em.createNativeQuery("""
        INSERT INTO ticket_attachments
        (ticket_id, file_name, content_type, size_bytes, file_data, uploaded_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    """)
                        .setParameter(1, ticket.getId())
                        .setParameter(2, a.getFileName())
                        .setParameter(3, a.getContentType())
                        .setParameter(4, a.getSizeBytes())
                        .setParameter(5, a.getFileData())
                        .setParameter(6, a.getUploadedAt())
                        .executeUpdate();
            }
        } catch (Exception e) {
            log.error("Erreur save attachments ticket {}: {}", ticketId, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur sauvegarde pièces jointes", e);
        }    }
}