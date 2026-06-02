package tn.esprit.ticketmanagement.Ticket.service;

import jakarta.annotation.PostConstruct;
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

    @PostConstruct
    public void init() {
        log.info("[DIAG] @PostConstruct: TicketSuggestionIndexService bean instantiated.");
        log.info("[DIAG]   vectorStore class: {}", vectorStore != null ? vectorStore.getClass().getName() : "NULL");
        log.info("[DIAG]   ticketRepository class: {}", ticketRepository != null ? ticketRepository.getClass().getName() : "NULL");
        log.info("[DIAG]   knowledgeBaseRepository class: {}", knowledgeBaseRepository != null ? knowledgeBaseRepository.getClass().getName() : "NULL");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("========================================");
        log.info("[DIAG] @EventListener(ApplicationReadyEvent) TRIGGERED");
        log.info("========================================");
        log.info("Auto-indexing resolved tickets and KB articles on startup...");
        try {
            indexAllResolvedTickets();
        } catch (Exception e) {
            log.error("[DIAG] indexAllResolvedTickets threw: {}: {}", e.getClass().getName(), e.getMessage(), e);
        }
        try {
            indexAllArticles();
        } catch (Exception e) {
            log.error("[DIAG] indexAllArticles threw: {}: {}", e.getClass().getName(), e.getMessage(), e);
        }
        log.info("[DIAG] Startup indexing complete. Verify with: SELECT COUNT(*) FROM vector_store;");
    }

    // ══════════════════════════════════════════
    //  INDEXING METHODS
    // ══════════════════════════════════════════

    public void indexTicketForSuggestions(Ticket ticket) {
        log.info("[DIAG] indexTicketForSuggestions called for ticket #{}", ticket.getId());
        log.info("[DIAG]   ticket status: {}, title: '{}'", ticket.getStatus(), ticket.getTitle());

        if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED) {
            log.info("[DIAG]   skipping ticket #{} - status is not RESOLVED/CLOSED", ticket.getId());
            return;
        }

        String docText = String.format(
                "Ticket #%d | Title: %s | Category: %s | Priority: %s | Description: %s",
                ticket.getId(), ticket.getTitle(),
                ticket.getCategory() != null ? ticket.getCategory() : "",
                ticket.getPriority() != null ? ticket.getPriority().name() : "",
                ticket.getDescription() != null ? ticket.getDescription() : ""
        );
        log.info("[DIAG]   document text: '{}'", docText.length() > 100 ? docText.substring(0, 100) + "..." : docText);

        Document doc = Document.builder()
                .text(docText)
                .metadata("type", "TICKET")
                .metadata("ticketId", String.valueOf(ticket.getId()))
                .metadata("creatorId", String.valueOf(ticket.getCreator().getId()))
                .metadata("status", ticket.getStatus().name())
                .build();

        log.info("[DIAG]   document id: {}, metadata: {}", doc.getId(), doc.getMetadata());
        log.info("[DIAG]   calling vectorStore.add() for ticket #{}...", ticket.getId());
        try {
            vectorStore.add(List.of(doc));
            log.info("[DIAG]   vectorStore.add() SUCCEEDED for ticket #{}", ticket.getId());
        } catch (Exception e) {
            log.error("[DIAG]   vectorStore.add() FAILED for ticket #{}: {}: {}",
                    ticket.getId(), e.getClass().getName(), e.getMessage(), e);
        }
        log.info("Indexed ticket #{} ({}) for suggestions", ticket.getId(), ticket.getStatus());
    }

    public void indexArticleForSuggestions(KnowledgeBaseArticle article) {
        log.info("[DIAG] indexArticleForSuggestions called for article #{}", article.getId());
        log.info("[DIAG]   article title: '{}', ticketId: {}", article.getTitle(), article.getTicketId());

        String docText = String.format(
                "Article: %s | Description: %s | Solution: %s",
                article.getTitle(),
                article.getDescription() != null ? article.getDescription() : "",
                article.getSolution()
        );
        log.info("[DIAG]   document text: '{}'", docText.length() > 100 ? docText.substring(0, 100) + "..." : docText);

        Document doc = Document.builder()
                .text(docText)
                .metadata("type", "KB_ARTICLE")
                .metadata("articleId", String.valueOf(article.getId()))
                .metadata("ticketId", article.getTicketId() != null ? String.valueOf(article.getTicketId()) : "")
                .build();

        log.info("[DIAG]   document id: {}, metadata: {}", doc.getId(), doc.getMetadata());
        log.info("[DIAG]   calling vectorStore.add() for article #{}...", article.getId());
        try {
            vectorStore.add(List.of(doc));
            log.info("[DIAG]   vectorStore.add() SUCCEEDED for article #{}", article.getId());
        } catch (Exception e) {
            log.error("[DIAG]   vectorStore.add() FAILED for article #{}: {}: {}",
                    article.getId(), e.getClass().getName(), e.getMessage(), e);
        }
        log.info("Indexed KB article #{} for suggestions", article.getId());
    }

    // ══════════════════════════════════════════
    //  BULK INDEXING
    // ══════════════════════════════════════════

    public void indexAllResolvedTickets() {
        log.info("[DIAG] indexAllResolvedTickets: fetching ALL tickets from DB...");
        List<Ticket> all;
        try {
            all = ticketRepository.findAll();
            log.info("[DIAG]   ticketRepository.findAll() returned {} tickets", all.size());
        } catch (Exception e) {
            log.error("[DIAG]   ticketRepository.findAll() FAILED: {}: {}", e.getClass().getName(), e.getMessage(), e);
            return;
        }

        int resolvedCount = 0;
        int closedCount = 0;
        int skippedCount = 0;
        for (Ticket ticket : all) {
            if (ticket.getStatus() == TicketStatus.RESOLVED) {
                resolvedCount++;
                log.info("[DIAG]   -> indexing RESOLVED ticket #{}", ticket.getId());
                indexTicketForSuggestions(ticket);
            } else if (ticket.getStatus() == TicketStatus.CLOSED) {
                closedCount++;
                log.info("[DIAG]   -> indexing CLOSED ticket #{}", ticket.getId());
                indexTicketForSuggestions(ticket);
            } else {
                skippedCount++;
                log.info("[DIAG]   -> SKIPPING ticket #{} (status={})", ticket.getId(), ticket.getStatus());
            }
        }
        log.info("[DIAG] indexAllResolvedTickets summary: RESOLVED={}, CLOSED={}, skipped={}, total={}",
                resolvedCount, closedCount, skippedCount, all.size());
    }

    public void indexAllArticles() {
        log.info("[DIAG] indexAllArticles: fetching ALL KB articles from DB...");
        List<KnowledgeBaseArticle> articles;
        try {
            articles = knowledgeBaseRepository.findAll();
            log.info("[DIAG]   knowledgeBaseRepository.findAll() returned {} articles", articles.size());
        } catch (Exception e) {
            log.error("[DIAG]   knowledgeBaseRepository.findAll() FAILED: {}: {}", e.getClass().getName(), e.getMessage(), e);
            return;
        }

        int indexedCount = 0;
        for (KnowledgeBaseArticle article : articles) {
            indexedCount++;
            log.info("[DIAG]   -> indexing article #{}", article.getId());
            indexArticleForSuggestions(article);
        }
        log.info("[DIAG] indexAllArticles summary: indexed={}, total={}", indexedCount, articles.size());
    }
}
