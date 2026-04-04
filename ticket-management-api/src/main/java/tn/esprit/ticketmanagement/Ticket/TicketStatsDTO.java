package tn.esprit.ticketmanagement.Ticket;

import lombok.*;
import java.util.Map;

@Getter @Setter
@Builder
@NoArgsConstructor @AllArgsConstructor
public class TicketStatsDTO {

    private long totalTickets;

    private long newTickets;
    private long feedbackTickets;
    private long acknowledgedTickets;
    private long confirmedTickets;
    private long assignedTickets;
    private long resolvedTickets;
    private long closedTickets;

    private long lowPriority;
    private long mediumPriority;
    private long highPriority;
    private long criticalPriority;

    private double averageResolutionTimeHours;
    private long ticketsCreatedLast7Days;
    private long ticketsResolvedLast7Days;
    private long ticketsCreatedLast30Days;
    private long ticketsResolvedLast30Days;
    private long slaBreachedTickets;
    private long unassignedTickets;

    private Map<String, Long> ticketsByDepartement;
    private Map<String, Long> ticketsByCategory;
}