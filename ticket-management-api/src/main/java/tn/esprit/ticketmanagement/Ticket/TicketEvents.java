package tn.esprit.ticketmanagement.Ticket;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;
import tn.esprit.ticketmanagement.User.entity.User;

public class TicketEvents {

    // ══════════════════════════════════════
    //  Événement : Ticket créé
    // ══════════════════════════════════════
    @Getter
    public static class TicketCreatedEvent extends ApplicationEvent {
        private final Ticket ticket;

        public TicketCreatedEvent(Object source, Ticket ticket) {
            super(source);
            this.ticket = ticket;
        }
    }

    // ══════════════════════════════════════
    //  Événement : Ticket assigné
    // ══════════════════════════════════════
    @Getter
    public static class TicketAssignedEvent extends ApplicationEvent {
        private final Ticket ticket;
        private final User assignee;

        public TicketAssignedEvent(Object source, Ticket ticket, User assignee) {
            super(source);
            this.ticket = ticket;
            this.assignee = assignee;
        }
    }

    // ══════════════��═══════════════════════
    //  Événement : Statut changé
    // ══════════════════════════════════════
    @Getter
    public static class TicketStatusChangedEvent extends ApplicationEvent {
        private final Ticket ticket;
        private final TicketStatus oldStatus;
        private final TicketStatus newStatus;

        public TicketStatusChangedEvent(Object source, Ticket ticket,
                                        TicketStatus oldStatus, TicketStatus newStatus) {
            super(source);
            this.ticket = ticket;
            this.oldStatus = oldStatus;
            this.newStatus = newStatus;
        }
    }
}