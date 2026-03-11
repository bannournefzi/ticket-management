package tn.esprit.ticketmanagement.Ticket;

import org.springframework.data.jpa.domain.Specification;
import tn.esprit.ticketmanagement.User.enums.Departement;

import java.time.LocalDateTime;

public class TicketSpecification {

    public static Specification<Ticket> hasStatus(TicketStatus status) {
        return (root, query, cb) ->
                status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Ticket> hasPriority(TicketPriority priority) {
        return (root, query, cb) ->
                priority == null ? null : cb.equal(root.get("priority"), priority);
    }

    public static Specification<Ticket> hasDepartement(Departement departement) {
        return (root, query, cb) ->
                departement == null ? null : cb.equal(root.get("departement"), departement);
    }

    public static Specification<Ticket> hasCategory(TicketCategory category) {
        return (root, query, cb) ->
                category == null ? null : cb.equal(root.get("category"), category);
    }

    public static Specification<Ticket> hasAssignee(Integer assigneeId) {
        return (root, query, cb) ->
                assigneeId == null ? null : cb.equal(root.get("assignedTo").get("id"), assigneeId);
    }

    public static Specification<Ticket> searchText(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) return null;
            String pattern = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(cb.lower(root.get("description")), pattern)
            );
        };
    }

    public static Specification<Ticket> isUnassigned() {
        return (root, query, cb) -> cb.isNull(root.get("assignedTo"));
    }

    public static Specification<Ticket> isSLABreached() {
        return (root, query, cb) -> cb.and(
                cb.notEqual(root.get("status"), TicketStatus.RESOLVED),
                cb.notEqual(root.get("status"), TicketStatus.CLOSED),
                cb.lessThan(root.get("dueDate"), LocalDateTime.now())
        );
    }
}