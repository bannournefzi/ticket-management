package tn.esprit.ticketmanagement.Notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import tn.esprit.ticketmanagement.Ticket.Ticket;
import tn.esprit.ticketmanagement.Ticket.TicketEvents;
import tn.esprit.ticketmanagement.User.entity.User;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {
    private final PlatformNotificationService notificationService;

    @EventListener
    public void onTicketCreated(TicketEvents.TicketCreatedEvent event) {
        Ticket ticket = event.getTicket();
        String msg = String.format("Ticket #%d: %s", ticket.getId(), ticket.getTitle());
        log.info("🔔 Notification event: TicketCreated #{} - sending to BA and Admin", ticket.getId());

        // Notify all Business Analysts
        notificationService.createAndPushToRole("ROLE_BUSINESS_ANALYST",
                NotificationType.TICKET_CREATED, "Nouveau ticket", msg, ticket.getId().toString());

        // Notify all Admins
        notificationService.createAndPushToRole("ROLE_ADMIN",
                NotificationType.TICKET_CREATED, "Nouveau ticket", msg, ticket.getId().toString());
    }

    @EventListener
    public void onTicketAssigned(TicketEvents.TicketAssignedEvent event) {
        Ticket ticket = event.getTicket();
        User assignee = event.getAssignee();
        String msg = String.format("Ticket #%d assigned to you: %s", ticket.getId(), ticket.getTitle());
        log.info("🔔 Notification event: TicketAssigned #{} to user {}", ticket.getId(), assignee.getId());

        notificationService.createAndPush(assignee.getId(),
                NotificationType.TICKET_ASSIGNED, "Ticket assigné", msg, ticket.getId().toString());
    }

    @EventListener
    public void onStatusChanged(TicketEvents.TicketStatusChangedEvent event) {
        Ticket ticket = event.getTicket();
        String msg = String.format("Ticket #%d status changed: %s → %s",
                ticket.getId(), event.getOldStatus(), event.getNewStatus());
        log.info("🔔 Notification event: StatusChanged #{} from {} to {}", ticket.getId(), event.getOldStatus(), event.getNewStatus());

        // Notify the ticket creator
        if (ticket.getCreator() != null) {
            notificationService.createAndPush(ticket.getCreator().getId(),
                    NotificationType.STATUS_CHANGED, "Statut modifié", msg, ticket.getId().toString());
        }
    }
}
