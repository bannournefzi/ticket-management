package tn.esprit.ticketmanagement.Ticket.enums;

import java.util.Map;
import java.util.Set;

public enum TicketStatus {
    NEW,
    FEEDBACK,
    ACKNOWLEDGED,
    CONFIRMED,
    ASSIGNED,
    RESOLVED,
    CLOSED;

    private static final Map<TicketStatus, Set<TicketStatus>> ALLOWED_TRANSITIONS = Map.of(
            NEW,          Set.of(FEEDBACK, ACKNOWLEDGED, CONFIRMED, ASSIGNED, RESOLVED, CLOSED),
            FEEDBACK,     Set.of(NEW, ACKNOWLEDGED, CONFIRMED, ASSIGNED, RESOLVED, CLOSED),
            ACKNOWLEDGED, Set.of(FEEDBACK, CONFIRMED, ASSIGNED, RESOLVED, CLOSED),
            CONFIRMED,    Set.of(FEEDBACK, ACKNOWLEDGED, ASSIGNED, RESOLVED, CLOSED),
            ASSIGNED,     Set.of(FEEDBACK, ACKNOWLEDGED, CONFIRMED, RESOLVED, CLOSED),
            RESOLVED,     Set.of(FEEDBACK, ACKNOWLEDGED, CONFIRMED, ASSIGNED, CLOSED),
            CLOSED,       Set.of(FEEDBACK, ACKNOWLEDGED, CONFIRMED, ASSIGNED, RESOLVED)
    );

    public boolean canTransitionTo(TicketStatus target) {
        return ALLOWED_TRANSITIONS.getOrDefault(this, Set.of()).contains(target);
    }

    public Set<TicketStatus> getAllowedTransitions() {
        return ALLOWED_TRANSITIONS.getOrDefault(this, Set.of());
    }
}