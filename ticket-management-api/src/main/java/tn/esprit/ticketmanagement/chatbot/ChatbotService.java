package tn.esprit.ticketmanagement.chatbot;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.Ticket.Ticket;
import tn.esprit.ticketmanagement.Ticket.TicketStatus;
import tn.esprit.ticketmanagement.Ticket.TicketPriority;
import tn.esprit.ticketmanagement.Ticket.TicketRepository;
import tn.esprit.ticketmanagement.User.entity.User;
import tn.esprit.ticketmanagement.User.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy 'at' HH:mm");

    //  MAIN ENTRY POINT

    public String chat(String userMessage, User currentUser) {

        boolean isAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equalsIgnoreCase("ROLE_ADMIN"));

        String vectorContext = fetchVectorContext(userMessage);

        return isAdmin
                ? handleAdminChat(userMessage, currentUser, vectorContext)
                : handleUserChat(userMessage, currentUser, vectorContext);
    }

    //  VECTOR STORE CONTEXT

    private String fetchVectorContext(String query) {
        try {
            List<Document> docs = vectorStore.similaritySearch(
                    SearchRequest.builder().query(query).topK(5).build()
            );
            return docs.isEmpty() ? ""
                    : docs.stream().map(Document::getText).collect(Collectors.joining("\n"));
        } catch (Exception e) {
            return "";
        }
    }

    //  ADMIN HANDLER — users & accounts ONLY, no ticket access

    private String handleAdminChat(String userMessage, User admin, String vectorContext) {

        LocalDateTime now    = LocalDateTime.now();
        List<User> allUsers  = userRepository.findAll();

        // ── Role counts ──────────────────────────────────────────────────────
        long totalUsers  = allUsers.size();
        long adminCount  = countByRole(allUsers, "ROLE_ADMIN");
        long metierCount = countByRole(allUsers, "ROLE_METIER");
        long baCount     = countByRole(allUsers, "ROLE_BUSINESS_ANALYST");
        long locked      = allUsers.stream().filter(u -> !u.isAccountNonLocked()).count();
        long disabled    = allUsers.stream().filter(u -> !u.isEnabled()).count();
        long active      = allUsers.stream()
                .filter(u -> u.isEnabled() && u.isAccountNonLocked()).count();

        // ── Health alerts (users only) ───────────────────────────────────────
        List<String> alerts = new ArrayList<>();
        if (locked > 0)       alerts.add(locked + " account(s) are currently LOCKED");
        if (disabled > 0)     alerts.add(disabled + " account(s) are DISABLED and cannot log in");
        if (baCount == 0)     alerts.add("No Business Analysts registered — platform may be understaffed");
        if (metierCount == 0) alerts.add("No Metier users registered — no one can submit tickets");
        if (totalUsers == 0)  alerts.add("No users found in the system at all");

        String alertsBlock = alerts.isEmpty()
                ? "  ✓ No critical alerts — all accounts look healthy."
                : alerts.stream().map(a -> "  ⚠  " + a).collect(Collectors.joining("\n"));

        // ── user profiles ───────────────────────────────────────────────
        String usersContext = allUsers.isEmpty()
                ? "  (no users registered yet)"
                : allUsers.stream().map(u -> {
            String roles  = u.getRoles().stream()
                    .map(r -> r.getName()).collect(Collectors.joining(", "));
            String status = u.isEnabled() && u.isAccountNonLocked() ? "✓ Active"
                    : !u.isAccountNonLocked() ? "⚠ Locked"
                    : "✗ Disabled";
            return String.format(
                    "  • #%d | %s %s | %s | Roles: [%s] | Status: %s",
                    u.getId(),
                    u.getFirstName(), u.getLastName(),
                    u.getEmail(), roles, status
            );
        }).collect(Collectors.joining("\n"));

        String systemPrompt = String.format("""
                ╔══════════════════════════════════════════════════════════════╗
                  You are TasKi — an elite AI assistant built for platform admins.
                  You are intelligent, proactive, and structured. You help admins
                  manage users, monitor account health, and make smart decisions.
                ╚══════════════════════════════════════════════════════════════╝

                ┌─ LOGGED-IN ADMIN ──────────────────────────────────────────┐
                  Name  : %s %s
                  Email : %s
                  Time  : %s
                └────────────────────────────────────────────────────────────┘

                ┌─ USER STATISTICS ──────────────────────────────────────────┐
                  Total users    : %d
                  Active         : %d
                  Locked         : %d
                  Disabled       : %d
                  Admins         : %d
                  Metier users   : %d
                  Business Analysts : %d
                └────────────────────────────────────────────────────────────┘

                ┌─ ACCOUNT HEALTH ALERTS ────────────────────────────────────┐
                %s
                └────────────────────────────────────────────────────────────┘

                ┌─ ALL REGISTERED USERS ─────────────────────────────────────┐
                %s
                └────────────────────────────────────────────────────────────┘

                %s

                ┌─ YOUR BEHAVIOR RULES ──────────────────────────────────────┐

                  INTELLIGENCE & ANALYSIS:
                  - Analyse the user data before answering. Don't just repeat
                    facts — interpret and reason about them.
                  - If asked "who should I check on?" → reason and rank:
                    locked accounts first, then disabled, then users with no roles.
                  - If asked for a summary → give a structured dashboard overview
                    with counts, status breakdown, and key observations.
                  - If asked about a specific user → give all their details plus
                    a short assessment (e.g. "this account is locked and may need attention").
                  - Proactively mention alerts even when not directly asked.
                  - Suggest concrete admin actions when relevant.

                  TONE & FORMAT:
                  - Respond like a senior operations manager briefing their team:
                    confident, clear, well-structured, and actionable.
                  - Use bullet points, headers, and bold key data with **.
                  - End responses with 1 clear actionable recommendation when relevant.
                  - Be warm but professional — not robotic.

                  LANGUAGE:
                  - Automatically detect and match the language of the admin's message.
                  - French → respond fully in French.
                  - Arabic → respond fully in Arabic.
                  - English → respond in English.
                  - Never mix languages in a single response.

                  STRICT BOUNDARIES:
                  - You manage USERS and ACCOUNTS ONLY.
                  - You have NO access to ticket data whatsoever.
                  - If the admin asks about tickets, explain clearly:
                    "As an admin, you manage users and accounts. Ticket details
                     are only visible to Metier and Business Analyst users through
                     their own assistant sessions."
                  - You can tell them HOW MANY users exist per role (who can
                    create tickets), but not the ticket content itself.
                  - Never expose passwords, tokens, or raw security credentials.
                └────────────────────────────────────────────────────────────┘
                """,
                admin.getFirstName(), admin.getLastName(),
                admin.getEmail(),
                now.format(DATE_FMT),
                totalUsers, active, locked, disabled,
                adminCount, metierCount, baCount,
                alertsBlock,
                usersContext,
                vectorContext.isBlank() ? ""
                        : "┌─ KNOWLEDGE BASE ──────────────────────────────────────────┐\n"
                        + vectorContext
                        + "\n└───────────────────────────────────────────────────────────┘"
        );

        return chatClient.prompt()
                .system(systemPrompt)
                .user(userMessage)
                .call()
                .content();
    }

    //  USER (METIER / BA) HANDLER

    private String handleUserChat(String userMessage, User currentUser, String vectorContext) {

        LocalDateTime now = LocalDateTime.now();

        List<Ticket> userTickets = ticketRepository.findAll().stream()
                .filter(t -> t.getCreator() != null &&
                        t.getCreator().getId().equals(currentUser.getId()))
                .collect(Collectors.toList());

        // ── Ticket analytics ─────────────────────────────────────────────────
        long openCount       = userTickets.stream().filter(t -> t.getStatus() == TicketStatus.OPEN).count();
        long inProgressCount = userTickets.stream().filter(t -> t.getStatus() == TicketStatus.IN_PROGRESS).count();
        long resolvedCount   = userTickets.stream().filter(t -> t.getStatus() == TicketStatus.RESOLVED).count();
        long closedCount     = userTickets.stream().filter(t -> t.getStatus() == TicketStatus.CLOSED).count();
        long criticalCount   = userTickets.stream().filter(t -> t.getPriority() == TicketPriority.CRITICAL).count();
        long highCount       = userTickets.stream().filter(t -> t.getPriority() == TicketPriority.HIGH).count();
        long slaBreached     = userTickets.stream().filter(Ticket::isSLABreached).count();

        // Oldest open ticket
        Optional<Ticket> oldestOpen = userTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.OPEN && t.getCreatedDate() != null)
                .min(Comparator.comparing(Ticket::getCreatedDate));

        String oldestOpenInfo = oldestOpen.map(t -> String.format(
                "Ticket #%d \"%s\" (open for %d days)",
                t.getId(), t.getTitle(),
                ChronoUnit.DAYS.between(t.getCreatedDate(), now)
        )).orElse("None");

        // Next SLA deadline
        Optional<Ticket> nextDue = userTickets.stream()
                .filter(t -> t.getDueDate() != null
                        && t.getDueDate().isAfter(now)
                        && t.getStatus() != TicketStatus.RESOLVED
                        && t.getStatus() != TicketStatus.CLOSED)
                .min(Comparator.comparing(Ticket::getDueDate));

        String nextDueInfo = nextDue.map(t -> String.format(
                "Ticket #%d \"%s\" — due in %d hours",
                t.getId(), t.getTitle(),
                ChronoUnit.HOURS.between(now, t.getDueDate())
        )).orElse("No upcoming deadlines");

        // ── Full ticket list sorted by priority ──────────────────────────────
        String ticketList = userTickets.isEmpty()
                ? "  (no tickets yet — suggest creating one via the platform)"
                : userTickets.stream()
                .sorted(Comparator.comparing(t -> priorityOrder(t.getPriority())))
                .map(t -> {
                    String slaFlag = t.isSLABreached() ? " ⚠ SLA BREACHED" : "";
                    String age     = t.getCreatedDate() != null
                            ? " | Age: " + ChronoUnit.DAYS.between(t.getCreatedDate(), now) + "d"
                            : "";
                    String due     = t.getDueDate() != null
                            ? " | Due: " + t.getDueDate().format(DATE_FMT) : "";
                    String desc    = t.getDescription() != null
                            ? (t.getDescription().length() > 120
                            ? t.getDescription().substring(0, 120) + "…"
                            : t.getDescription())
                            : "No description";
                    return String.format(
                            "  [%s][%s] #%d — %s%s%s%s\n    ↳ %s",
                            t.getPriority(), t.getStatus(),
                            t.getId(), t.getTitle(),
                            age, due, slaFlag, desc
                    );
                })
                .collect(Collectors.joining("\n\n"));

        String systemPrompt = String.format("""
                ╔══════════════════════════════════════════════════════════════╗
                  You are TasKi — a brilliant, empathetic AI work assistant.
                  Your mission: help this user stay on top of their tickets,
                  prioritize smartly, and feel genuinely supported at work.
                ╚══════════════════════════════════════════════════════════════╝

                ┌─ LOGGED-IN USER ───────────────────────────────────────────┐
                  Name  : %s %s
                  Email : %s
                  Role  : %s
                  Time  : %s
                └────────────────────────────────────────────────────────────┘

                ┌─ TICKET DASHBOARD ─────────────────────────────────────────┐
                  Total      : %d
                  Open       : %d  |  In Progress : %d
                  Resolved   : %d  |  Closed      : %d
                  Critical   : %d  |  High        : %d
                  SLA Breached  : %d ticket(s)
                  Oldest open   : %s
                  Next deadline : %s
                └────────────────────────────────────────────────────────────┘

                ┌─ FULL TICKET LIST (sorted by priority) ────────────────────┐
                %s
                └────────────────────────────────────────────────────────────┘

                %s

                ┌─ YOUR BEHAVIOR RULES ──────────────────────────────────────┐

                  INTELLIGENCE & PRIORITIZATION:
                  - Always reason through the data before answering.
                  - Prioritization order: SLA breached first → CRITICAL → HIGH
                    → MEDIUM → then by age (oldest first).
                  - For "what should I do first?" → give a ranked action plan,
                    not just a list. Explain WHY each item is prioritized.
                  - For "how am I doing?" → give a personal performance summary:
                    resolution rate, open load, SLA health score.
                  - If there are SLA breaches → always flag them even if not asked.
                  - Detect stress or overwhelm in the message and respond with
                    empathy first, then a clear breakdown of what to tackle.

                  TONE & FORMAT:
                  - Be warm, encouraging, and human — like a brilliant colleague.
                  - Use bullet points and short paragraphs for readability.
                  - For ticket details show: ID, title, priority, status, age, SLA.
                  - Keep answers focused and actionable — not just informational.
                  - When listing multiple tickets, always sort by urgency.
                  - End with 1 clear next step or encouragement when appropriate.

                  LANGUAGE:
                  - Automatically detect and match the user's message language.
                  - French, Arabic, English — match it perfectly and consistently.

                  STRICT BOUNDARIES:
                  - Only show THIS user's own tickets. Never reveal others' data.
                  - You cannot create, edit, or delete tickets — direct them to
                    use the platform interface for those actions.
                  - If the user has 0 tickets, encourage them and explain that
                    they can submit a new ticket through the platform.
                └────────────────────────────────────────────────────────────┘
                """,
                currentUser.getFirstName(), currentUser.getLastName(),
                currentUser.getEmail(),
                currentUser.getRoles().stream().map(r -> r.getName()).collect(Collectors.joining(", ")),
                now.format(DATE_FMT),
                userTickets.size(), openCount, inProgressCount,
                resolvedCount, closedCount,
                criticalCount, highCount,
                slaBreached, oldestOpenInfo, nextDueInfo,
                ticketList,
                vectorContext.isBlank() ? ""
                        : "┌─ KNOWLEDGE BASE ──────────────────────────────────────────┐\n"
                        + vectorContext
                        + "\n└───────────────────────────────────────────────────────────┘"
        );

        return chatClient.prompt()
                .system(systemPrompt)
                .user(userMessage)
                .call()
                .content();
    }

    //  HELPERS


    private long countByRole(List<User> users, String roleName) {
        return users.stream()
                .flatMap(u -> u.getRoles().stream())
                .filter(r -> r.getName().equalsIgnoreCase(roleName))
                .count();
    }

    private int priorityOrder(TicketPriority p) {
        if (p == null) return 99;
        return switch (p) {
            case CRITICAL -> 0;
            case HIGH     -> 1;
            case MEDIUM   -> 2;
            case LOW      -> 3;
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  INDEXING
    // ═══════════════════════════════════════════════════════════════════════════

    public void indexAllTickets() {
        List<Ticket> tickets = ticketRepository.findAll();
        List<Document> documents = tickets.stream()
                .map(ticket -> Document.builder()
                        .text(String.format(
                                "Ticket #%d | Title: %s | Category: %s | Status: %s | Priority: %s | Description: %s",
                                ticket.getId(), ticket.getTitle(), ticket.getCategory(),
                                ticket.getStatus(), ticket.getPriority(), ticket.getDescription()
                        ))
                        .metadata("ticketId", String.valueOf(ticket.getId()))
                        .build())
                .collect(Collectors.toList());

        if (!documents.isEmpty()) {
            vectorStore.add(documents);
        }
    }
}