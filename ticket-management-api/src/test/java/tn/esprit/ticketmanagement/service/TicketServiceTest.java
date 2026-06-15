package tn.esprit.ticketmanagement.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import tn.esprit.ticketmanagement.Audit.service.AuditLogService;
import tn.esprit.ticketmanagement.Ticket.CreateTicketRequest;
import tn.esprit.ticketmanagement.Ticket.dto.TicketDTO;
import tn.esprit.ticketmanagement.Ticket.entity.Ticket;
import tn.esprit.ticketmanagement.Ticket.enums.TicketPriority;
import tn.esprit.ticketmanagement.Ticket.enums.TicketStatus;
import tn.esprit.ticketmanagement.Ticket.exception.TicketNotFoundException;
import tn.esprit.ticketmanagement.Ticket.repository.TicketAttachmentRepository;
import tn.esprit.ticketmanagement.Ticket.repository.TicketHistoryRepository;
import tn.esprit.ticketmanagement.Ticket.repository.TicketRepository;
import tn.esprit.ticketmanagement.Ticket.service.TicketService;
import tn.esprit.ticketmanagement.Ticket.service.TicketSuggestionIndexService;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;
import tn.esprit.ticketmanagement.group.repository.GroupMembershipRepository;
import tn.esprit.ticketmanagement.group.repository.GroupRepository;
import tn.esprit.ticketmanagement.mantis.MantisProperties;
import tn.esprit.ticketmanagement.mantis.MantisService;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock TicketRepository ticketRepository;
    @Mock TicketHistoryRepository historyRepository;
    @Mock TicketAttachmentRepository ticketAttachmentRepository;
    @Mock UserRepository userRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock MantisService mantisService;
    @Mock MantisProperties mantisProperties;
    @Mock TicketSuggestionIndexService ticketSuggestionIndexService;
    @Mock GroupRepository groupRepository;
    @Mock GroupMembershipRepository groupMembershipRepository;
    @Mock AuditLogService auditLogService;
    @Mock EntityManager em;

    @InjectMocks TicketService ticketService;

    // ── Helpers ──────────────────────────────

    private User makeUser(boolean isAdmin, boolean isBA, boolean isUser) {
        User user = mock(User.class, withSettings().lenient());
        when(user.getId()).thenReturn(1);
        when(user.fullName()).thenReturn("Bannour Nefzi");
        when(user.getEmail()).thenReturn("bannour@test.com");
        when(user.isAdmin()).thenReturn(isAdmin);
        when(user.isBusinessAnalyst()).thenReturn(isBA);
        when(user.isUser()).thenReturn(isUser);
        when(user.isIT()).thenReturn(isBA);
        return user;
    }

    private Ticket makeTicket(Integer id, TicketStatus status) {
        User creator = makeUser(false, false, true);
        Ticket ticket = Ticket.builder()
                .title("Test ticket")
                .description("Description")
                .priority(TicketPriority.MEDIUM)
                .status(status)
                .creator(creator)
                .tags(List.of())
                .build();
        // set createdDate pour éviter NPE dans SLAConfig
        org.springframework.test.util.ReflectionTestUtils.setField(ticket, "createdDate", LocalDateTime.now());
        org.springframework.test.util.ReflectionTestUtils.setField(ticket, "id", id);
        return ticket;
    }

    // ── Tests createTicket ────────────────────

    @Test
    void createTicket_shouldSaveAndReturnDTO() {
        User currentUser = makeUser(false, false, true);

        CreateTicketRequest request = new CreateTicketRequest();
        request.setTitle("Problème réseau");
        request.setDescription("Impossible de se connecter");
        request.setPriority(TicketPriority.HIGH);

        Ticket saved = makeTicket(1, TicketStatus.NEW);

        when(groupMembershipRepository.findByUserAndLeftAtIsNull(currentUser)).thenReturn(List.of());
        when(ticketRepository.save(any())).thenReturn(saved);
        when(historyRepository.save(any())).thenReturn(null);
        when(ticketAttachmentRepository.findByTicketId(any())).thenReturn(List.of());

        TicketDTO result = ticketService.createTicket(request, currentUser);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(TicketStatus.NEW);
        verify(ticketRepository).save(any(Ticket.class));
        verify(auditLogService).log(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void createTicket_shouldSetStatusToAssigned_whenAssigneeProvided() {
        User admin = makeUser(true, false, false);

        User assignee = mock(User.class, withSettings().lenient());
        when(assignee.getId()).thenReturn(2);
        when(assignee.fullName()).thenReturn("BA User");
        when(assignee.isIT()).thenReturn(true);

        CreateTicketRequest request = new CreateTicketRequest();
        request.setTitle("Ticket avec assigné");
        request.setDescription("Desc");
        request.setPriority(TicketPriority.LOW);
        request.setAssignedToId(2);

        Ticket saved = makeTicket(1, TicketStatus.ASSIGNED);

        when(groupMembershipRepository.findByUserAndLeftAtIsNull(admin)).thenReturn(List.of());
        when(userRepository.findById(2)).thenReturn(Optional.of(assignee));
        when(ticketRepository.save(any())).thenReturn(saved);
        when(historyRepository.save(any())).thenReturn(null);
        when(ticketAttachmentRepository.findByTicketId(any())).thenReturn(List.of());

        TicketDTO result = ticketService.createTicket(request, admin);

        assertThat(result.getStatus()).isEqualTo(TicketStatus.ASSIGNED);
    }

    // ── Tests deleteTicket ────────────────────

    @Test
    void deleteTicket_shouldDeleteWhenExists() {
        when(ticketRepository.existsById(1)).thenReturn(true);

        ticketService.deleteTicket(1);

        verify(ticketRepository).deleteById(1);
    }

    @Test
    void deleteTicket_shouldThrowWhenNotFound() {
        when(ticketRepository.existsById(99)).thenReturn(false);

        assertThatThrownBy(() -> ticketService.deleteTicket(99))
                .isInstanceOf(TicketNotFoundException.class);
    }

    // ── Tests getTicketById ───────────────────

    @Test
    void getTicketById_shouldReturnDTO_forAdmin() {
        User admin = makeUser(true, false, false);
        Ticket ticket = makeTicket(1, TicketStatus.NEW);

        when(ticketRepository.findById(1)).thenReturn(Optional.of(ticket));
        when(ticketAttachmentRepository.findByTicketId(1)).thenReturn(List.of());

        TicketDTO result = ticketService.getTicketById(1, admin);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1);
    }

    @Test
    void getTicketById_shouldThrowWhenNotFound() {
        when(ticketRepository.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ticketService.getTicketById(99, makeUser(true, false, false)))
                .isInstanceOf(TicketNotFoundException.class);
    }

    // ── Tests updateTicketStatus ──────────────

    @Test
    void updateTicketStatus_shouldTransitionNewToAssigned() {
        User ba = makeUser(false, true, false);
        Ticket ticket = makeTicket(1, TicketStatus.NEW);

        when(ticketRepository.findById(1)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any())).thenReturn(ticket);
        when(historyRepository.save(any())).thenReturn(null);
        when(ticketAttachmentRepository.findByTicketId(any())).thenReturn(List.of());

        TicketDTO result = ticketService.updateTicketStatus(1, TicketStatus.ASSIGNED, ba, "Assignation");

        assertThat(result).isNotNull();
        verify(ticketRepository).save(any(Ticket.class));
    }

    @Test
    void updateTicketStatus_shouldThrowOnInvalidTransition() {
        Ticket ticket = makeTicket(1, TicketStatus.CLOSED);

        when(ticketRepository.findById(1)).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() ->
                ticketService.updateTicketStatus(1, TicketStatus.NEW, makeUser(false, true, false), "tentative"))
                .isInstanceOf(tn.esprit.ticketmanagement.Ticket.exception.InvalidStatusTransitionException.class);
    }

    // ── Tests assignTicket ────────────────────

    @Test
    void assignTicket_shouldAssignAndReturnDTO() {
        User admin = makeUser(true, false, false);

        User assignee = mock(User.class, withSettings().lenient());
        when(assignee.getId()).thenReturn(2);
        when(assignee.fullName()).thenReturn("BA User");
        when(assignee.isIT()).thenReturn(true);

        Ticket ticket = makeTicket(1, TicketStatus.NEW);

        when(ticketRepository.findById(1)).thenReturn(Optional.of(ticket));
        when(userRepository.findById(2)).thenReturn(Optional.of(assignee));
        when(ticketRepository.save(any())).thenReturn(ticket);
        when(historyRepository.save(any())).thenReturn(null);
        when(ticketAttachmentRepository.findByTicketId(any())).thenReturn(List.of());

        TicketDTO result = ticketService.assignTicket(1, 2, admin);

        assertThat(result).isNotNull();
        verify(ticketRepository).save(any(Ticket.class));
    }

    @Test
    void assignTicket_shouldThrowWhenAssigneeNotBA() {
        User nonBA = mock(User.class, withSettings().lenient());
        when(nonBA.isIT()).thenReturn(false);

        Ticket ticket = makeTicket(1, TicketStatus.NEW);

        when(ticketRepository.findById(1)).thenReturn(Optional.of(ticket));
        when(userRepository.findById(3)).thenReturn(Optional.of(nonBA));

        assertThatThrownBy(() -> ticketService.assignTicket(1, 3, makeUser(true, false, false)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("BUSINESS_ANALYST");
    }
}