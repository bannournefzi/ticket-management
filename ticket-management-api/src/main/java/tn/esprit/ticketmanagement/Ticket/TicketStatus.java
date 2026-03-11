package tn.esprit.ticketmanagement.Ticket;

import java.util.Map;
import java.util.Set;

public enum TicketStatus {
    OPEN,
    IN_PROGRESS,
    ON_HOLD,
    RESOLVED,
    CLOSED,
    REJECTED;

    private static final Map<TicketStatus, Set<TicketStatus>> ALLOWED_TRANSITIONS = Map.of(
            OPEN,        Set.of(IN_PROGRESS, ON_HOLD, REJECTED, CLOSED),
            IN_PROGRESS, Set.of(ON_HOLD, RESOLVED, REJECTED, CLOSED),
            ON_HOLD,     Set.of(IN_PROGRESS, RESOLVED, CLOSED),
            RESOLVED,    Set.of(CLOSED, IN_PROGRESS, OPEN),
            REJECTED,    Set.of(OPEN),
            CLOSED,      Set.of(OPEN)
    );

    public boolean canTransitionTo(TicketStatus target) {
        return ALLOWED_TRANSITIONS.getOrDefault(this, Set.of()).contains(target);
    }

    public Set<TicketStatus> getAllowedTransitions() {
        return ALLOWED_TRANSITIONS.getOrDefault(this, Set.of());
    }
}