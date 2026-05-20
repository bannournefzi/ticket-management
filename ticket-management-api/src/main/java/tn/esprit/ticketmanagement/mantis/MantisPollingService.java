package tn.esprit.ticketmanagement.mantis;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.Ticket.entity.Ticket;
import tn.esprit.ticketmanagement.Ticket.entity.TicketHistory;
import tn.esprit.ticketmanagement.Ticket.enums.TicketStatus;
import tn.esprit.ticketmanagement.Ticket.repository.TicketHistoryRepository;
import tn.esprit.ticketmanagement.Ticket.repository.TicketRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MantisPollingService {

    private final MantisService mantisService;
    private final TicketRepository ticketRepository;
    private final TicketHistoryRepository historyRepository;

    @PostConstruct
    public void init() {
        log.info("═══════════════════════════════════════");
        log.info("  MantisPollingService ACTIF");
        log.info("  Intervalle: 15 secondes");
        log.info("═══════════════════════════════════════");
    }

    @Scheduled(fixedDelay = 15_000)
    public void syncMantisStatuses() {
        log.info("⏳ Mantis sync cycle starting...");

        List<Ticket> linkedTickets = ticketRepository.findAll()
            .stream()
            .filter(t -> t.getMantisId() != null)
            .filter(t -> t.getStatus() != TicketStatus.CLOSED)
            .collect(Collectors.toList());

        if (linkedTickets.isEmpty()) {
            log.info("⏳ No linked tickets to sync");
            return;
        }

        log.info("⏳ Checking Mantis status for {} linked tickets", linkedTickets.size());

        for (Ticket ticket : linkedTickets) {
            try {
                // Skip tickets recently pushed from platform (prevent ping-pong)
                if (mantisService.isRecentlyPushed(ticket.getMantisId())) {
                    log.debug("Ticket #{} (mantisId={}) recently pushed — skipping poll sync",
                        ticket.getId(), ticket.getMantisId());
                    continue;
                }

                String mantisStatus = mantisService.getIssueStatus(ticket.getMantisId());
                if (mantisStatus == null) {
                    log.debug("No Mantis status returned for ticket #{} (mantisId={})",
                        ticket.getId(), ticket.getMantisId());
                    continue;
                }

                TicketStatus newStatus = mapMantisStatusToPlatform(mantisStatus);
                if (newStatus == null) {
                    log.warn("Mantis status '{}' not mapped for ticket #{} (mantisId={})",
                        mantisStatus, ticket.getId(), ticket.getMantisId());
                    continue;
                }

                if (ticket.getStatus() == newStatus) {
                    log.debug("Ticket #{} status unchanged: {}", ticket.getId(), newStatus);
                    continue;
                }

                if (!ticket.getStatus().canTransitionTo(newStatus)) {
                    log.warn("Cannot transition ticket #{} from {} to {} (blocked by workflow) — Mantis status ignored",
                        ticket.getId(), ticket.getStatus(), newStatus);
                    continue;
                }

                TicketStatus oldStatus = ticket.getStatus();
                ticket.setStatus(newStatus);

                if (newStatus == TicketStatus.RESOLVED) {
                    ticket.setResolvedDate(LocalDateTime.now());
                } else if (newStatus == TicketStatus.CLOSED) {
                    ticket.setClosedDate(LocalDateTime.now());
                }

                ticketRepository.save(ticket);

                TicketHistory history = TicketHistory.builder()
                    .ticket(ticket)
                    .oldStatus(oldStatus)
                    .newStatus(newStatus)
                    .fieldChanged("status")
                    .oldValue(oldStatus.name())
                    .newValue(newStatus.name())
                    .comment("Synchronisé depuis MantisBT #" + ticket.getMantisId())
                    .changedAt(LocalDateTime.now())
                    .build();
                historyRepository.save(history);

                log.info("Ticket #{} status synced FROM Mantis: {} → {}", 
                    ticket.getId(), oldStatus, newStatus);
            } catch (Exception e) {
                log.warn("Error syncing ticket #{} from Mantis: {}", ticket.getId(), e.getMessage());
            }
        }
    }

    private TicketStatus mapMantisStatusToPlatform(String mantisStatus) {
        try {
            int id = Integer.parseInt(mantisStatus);
            return switch (id) {
                case 10  -> TicketStatus.NEW;
                case 20  -> TicketStatus.FEEDBACK;
                case 30  -> TicketStatus.ACKNOWLEDGED;
                case 40  -> TicketStatus.CONFIRMED;
                case 50  -> TicketStatus.ASSIGNED;
                case 80  -> TicketStatus.RESOLVED;
                case 90  -> TicketStatus.CLOSED;
                default  -> {
                    log.warn("Unknown Mantis status ID: {}", id);
                    yield null;
                }
            };
        } catch (NumberFormatException e) {
            log.warn("Cannot parse Mantis status '{}' as ID", mantisStatus);
            return null;
        }
    }
}
