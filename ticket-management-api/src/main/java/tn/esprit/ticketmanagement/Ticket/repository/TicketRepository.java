package tn.esprit.ticketmanagement.Ticket.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.esprit.ticketmanagement.Ticket.enums.TicketPriority;
import tn.esprit.ticketmanagement.Ticket.enums.TicketStatus;
import tn.esprit.ticketmanagement.Ticket.entity.Ticket;
import tn.esprit.ticketmanagement.group.entity.Group;

import java.time.LocalDateTime;
import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Integer>,
        JpaSpecificationExecutor<Ticket> {

    // ===== Paginé =====
    Page<Ticket> findByCreatorId(Integer creatorId, Pageable pageable);
    Page<Ticket> findByAssignedToId(Integer assignedToId, Pageable pageable);

    // ===== Listes simples =====
    List<Ticket> findByCreatorId(Integer creatorId);
    List<Ticket> findByAssignedToId(Integer assignedToId);

    // ===== Compteurs =====
    long countByStatus(TicketStatus status);
    long countByPriority(TicketPriority priority);
    long countByCreatorId(Integer creatorId);
    long countByAssignedToId(Integer assignedToId);

    // ===== Stats : récupérer les dates pour calcul en Java =====
    // ✅ CORRIGÉ : plus de TIMESTAMPDIFF, on calcule en Java
    @Query("SELECT t.createdDate, t.resolvedDate FROM Ticket t WHERE t.resolvedDate IS NOT NULL")
    List<Object[]> findResolvedTicketDates();

    @Query("SELECT t.departement, COUNT(t) FROM Ticket t " +
            "WHERE t.departement IS NOT NULL GROUP BY t.departement")
    List<Object[]> countByDepartementGrouped();

    @Query("SELECT t.category, COUNT(t) FROM Ticket t GROUP BY t.category")
    List<Object[]> countByCategoryGrouped();

    @Query("SELECT t FROM Ticket t WHERE t.dueDate < :now " +
            "AND t.status NOT IN (tn.esprit.ticketmanagement.Ticket.TicketStatus.RESOLVED, " +
            "tn.esprit.ticketmanagement.Ticket.TicketStatus.CLOSED)")
    List<Ticket> findSLABreachedTickets(@Param("now") LocalDateTime now);

    @Query("SELECT t FROM Ticket t WHERE t.assignedTo IS NULL " +
            "AND t.status = tn.esprit.ticketmanagement.Ticket.TicketStatus.NEW " +
            "ORDER BY t.createdDate ASC")
    List<Ticket> findUnassignedNewTickets();

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.createdDate >= :since")
    long countCreatedSince(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.resolvedDate >= :since")
    long countResolvedSince(@Param("since") LocalDateTime since);

    Page<Ticket> findByCreatorIdIn(List<Integer> creatorIds, Pageable pageable);
    List<Ticket> findByCreatorIdIn(List<Integer> creatorIds);

    // Group-based queries for point-in-time membership
    // IMPORTANT: Must explicitly check that groupAtCreation is NOT NULL
    @Query("SELECT t FROM Ticket t WHERE t.groupAtCreation IS NOT NULL AND t.groupAtCreation IN :groups")
    List<Ticket> findByGroupAtCreationIn(@Param("groups") List<Group> groups);

    @Query("SELECT t FROM Ticket t WHERE t.groupAtCreation IS NOT NULL AND t.groupAtCreation = :group")
    List<Ticket> findByGroupAtCreation(@Param("group") Group group);

    @Query("SELECT t FROM Ticket t WHERE t.groupAtCreation IS NULL")
    List<Ticket> findByGroupAtCreationIsNull();

    // Filter by creator AND groupAtCreation (for BA access control)
    // Shows: tickets with group in user's current groups, OR tickets with NO group only for self
    @Query("SELECT t FROM Ticket t WHERE t.creator.id IN :creatorIds AND (t.groupAtCreation IN :groups OR (t.groupAtCreation IS NULL AND t.creator.id = :currentUserId))")
    Page<Ticket> findByCreatorIdInAndGroupAtCreationInOrNull(@Param("creatorIds") List<Integer> creatorIds,
                                                               @Param("groups") List<Group> groups,
                                                               @Param("currentUserId") Integer currentUserId,
                                                               Pageable pageable);

    @Query("SELECT t FROM Ticket t WHERE t.creator.id IN :creatorIds AND (t.groupAtCreation IN :groups OR (t.groupAtCreation IS NULL AND t.creator.id = :currentUserId))")
    List<Ticket> findByCreatorIdInAndGroupAtCreationInOrNull(@Param("creatorIds") List<Integer> creatorIds,
                                                              @Param("groups") List<Group> groups,
                                                              @Param("currentUserId") Integer currentUserId);

}