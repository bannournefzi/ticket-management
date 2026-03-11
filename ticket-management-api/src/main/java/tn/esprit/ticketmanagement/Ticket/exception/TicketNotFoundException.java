package tn.esprit.ticketmanagement.Ticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class TicketNotFoundException extends RuntimeException {
    public TicketNotFoundException(Integer id) {
        super("Ticket non trouvé avec l'id: " + id);
    }
}
