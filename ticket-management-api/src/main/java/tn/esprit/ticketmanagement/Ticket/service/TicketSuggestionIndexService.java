package tn.esprit.ticketmanagement.Ticket.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.Ticket.entity.Ticket;
import tn.esprit.ticketmanagement.Ticket.enums.TicketStatus;
import tn.esprit.ticketmanagement.Ticket.repository.TicketRepository;
import tn.esprit.ticketmanagement.KnowledgeBase.entity.KnowledgeBaseArticle;
import tn.esprit.ticketmanagement.KnowledgeBase.KnowledgeBaseRepository;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TicketSuggestionIndexService {

    private final VectorStore vectorStore;
    private final TicketRepository ticketRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;

    // ══════════════════════════════════════════
    //  LIFECYCLE
    // ══════════════════════════════════════════

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("[AI] Starting vector indexing on startup...");
        try {
            indexAllResolvedTickets();
            indexAllArticles();
            log.info("[AI] Vector indexing complete.");
        } catch (Exception e) {
            // Ollama not running — app starts normally without AI features
            log.warn("[AI] Ollama unavailable — vector indexing skipped. " +
                    "Start Ollama ('ollama serve') and restart to enable AI suggestions.");
        }
    }

    // ══════════════════════════════════════════
    //  INDEXING METHODS
    // ══════════════════════════════════════════

    public void indexTicketForSuggestions(Ticket ticket) {
        if (ticket.getStatus() != TicketStatus.RESOLVED &&
                ticket.getStatus() != TicketStatus.CLOSED) {
            return;
        }

        String docText = String.format(
                "Ticket #%d | Title: %s | Category: %s | Priority: %s | Description: %s",
                ticket.getId(),
                ticket.getTitle(),
                ticket.getCategory() != null ? ticket.getCategory() : "",
                ticket.getPriority() != null ? ticket.getPriority().name() : "",
                ticket.getDescription() != null ? ticket.getDescription() : ""
        );

        Document doc = Document.builder()
                .text(docText)
                .metadata("type", "TICKET")
                .metadata("ticketId", String.valueOf(ticket.getId()))
                .metadata("creatorId", String.valueOf(ticket.getCreator().getId()))
                .metadata("status", ticket.getStatus().name())
                .build();

        vectorStore.add(List.of(doc));
        log.debug("[AI] Indexed ticket #{} ({})", ticket.getId(), ticket.getStatus());
    }

    public void indexArticleForSuggestions(KnowledgeBaseArticle article) {
        String docText = String.format(
                "Article: %s | Description: %s | Solution: %s",
                article.getTitle(),
                article.getDescription() != null ? article.getDescription() : "",
                article.getSolution()
        );

        Document doc = Document.builder()
                .text(docText)
                .metadata("type", "KB_ARTICLE")
                .metadata("articleId", String.valueOf(article.getId()))
                .metadata("ticketId", article.getTicketId() != null ?
                        String.valueOf(article.getTicketId()) : "")
                .build();

        vectorStore.add(List.of(doc));
        log.debug("[AI] Indexed KB article #{}", article.getId());
    }

    // ══════════════════════════════════════════
    //  BULK INDEXING
    // ══════════════════════════════════════════

    public void indexAllResolvedTickets() {
        List<Ticket> all = ticketRepository.findAll();
        int indexed = 0;
        for (Ticket ticket : all) {
            if (ticket.getStatus() == TicketStatus.RESOLVED ||
                    ticket.getStatus() == TicketStatus.CLOSED) {
                indexTicketForSuggestions(ticket);
                indexed++;
            }
        }
        log.info("[AI] Tickets indexed: {}/{}", indexed, all.size());
    }

    public void indexAllArticles() {
        List<KnowledgeBaseArticle> articles = knowledgeBaseRepository.findAll();
        for (KnowledgeBaseArticle article : articles) {
            indexArticleForSuggestions(article);
        }
        log.info("[AI] KB articles indexed: {}", articles.size());
    }
}