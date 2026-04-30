package tn.esprit.ticketmanagement.Ticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import tn.esprit.ticketmanagement.Ticket.enums.TicketStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidStatusTransitionException extends RuntimeException {
    public InvalidStatusTransitionException(TicketStatus from, TicketStatus to) {
        super(String.format("Transition de statut invalide: %s → %s", from, to));
    }
}
