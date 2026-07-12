package tn.esprit.ticketmanagement.Ticket;

import tn.esprit.ticketmanagement.Ticket.enums.TicketPriority;
import tn.esprit.ticketmanagement.Ticket.enums.TicketStatus;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

public class SLAConfig {

    // Délai maximum pour RÉSOUDRE un ticket selon sa priorité
    private static final Map<TicketPriority, Duration> SLA_DEADLINES = Map.of(
            TicketPriority.CRITICAL, Duration.ofHours(4),    // 4 heures
            TicketPriority.HIGH,     Duration.ofHours(8),    // 8 heures
            TicketPriority.MEDIUM,   Duration.ofHours(24),   // 1 jour
            TicketPriority.LOW,      Duration.ofHours(72)    // 3 jours
    );

    // Délai maximum pour la PREMIÈRE RÉPONSE (assignation)
    private static final Map<TicketPriority, Duration> FIRST_RESPONSE = Map.of(
            TicketPriority.CRITICAL, Duration.ofMinutes(30),
            TicketPriority.HIGH,     Duration.ofHours(1),
            TicketPriority.MEDIUM,   Duration.ofHours(4),
            TicketPriority.LOW,      Duration.ofHours(12)
    );

    public static Duration getResolutionDeadline(TicketPriority priority) {
        return SLA_DEADLINES.getOrDefault(priority, Duration.ofHours(72));
    }

    public static LocalDateTime calculateDueDate(TicketPriority priority, LocalDateTime createdDate) {
        return createdDate.plus(getResolutionDeadline(priority));
    }

    public static LocalDateTime calculateFirstResponseDue(TicketPriority priority, LocalDateTime createdDate) {
        return createdDate.plus(FIRST_RESPONSE.getOrDefault(priority, Duration.ofHours(12)));
    }

    /**
     * Vérifie l'état du SLA pour un ticket
     */
    public static SLAStatus checkSLAStatus(TicketPriority priority,
                                           LocalDateTime createdDate,
                                           TicketStatus currentStatus) {
        // Déjà résolu ou fermé → SLA respecté
        if (currentStatus == TicketStatus.RESOLVED || currentStatus == TicketStatus.CLOSED) {
            return SLAStatus.MET;
        }

        LocalDateTime dueDate = calculateDueDate(priority, createdDate);
        LocalDateTime now = LocalDateTime.now();

        // Dépassé !
        if (now.isAfter(dueDate)) {
            return SLAStatus.BREACHED;
        }

        // Moins de 25% du temps restant → à risque
        Duration total = getResolutionDeadline(priority);
        Duration remaining = Duration.between(now, dueDate);
        if (remaining.toMinutes() < total.toMinutes() * 0.25) {
            return SLAStatus.AT_RISK;
        }

        return SLAStatus.ON_TRACK;
    }

    public enum SLAStatus {
        ON_TRACK,
        AT_RISK,
        BREACHED,
        MET
    }
}
