package tn.esprit.ticketmanagement.Ticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalTicketExceptionHandler {

    @ExceptionHandler(TicketNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(TicketNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidStatusTransitionException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidTransition(InvalidStatusTransitionException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedTicketAccessException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorized(UnauthorizedTicketAccessException ex) {
        return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", status.value(),
                "error", status.getReasonPhrase(),
                "message", message
        ));
    }
}
