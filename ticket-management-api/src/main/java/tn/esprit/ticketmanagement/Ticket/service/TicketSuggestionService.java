package tn.esprit.ticketmanagement.Ticket.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tn.esprit.ticketmanagement.KnowledgeBase.KnowledgeBaseRepository;
import tn.esprit.ticketmanagement.KnowledgeBase.entity.KnowledgeBaseArticle;
import tn.esprit.ticketmanagement.Ticket.dto.SuggestionItem;
import tn.esprit.ticketmanagement.Ticket.dto.TicketSuggestionRequest;
import tn.esprit.ticketmanagement.Ticket.dto.TicketSuggestionResponse;
import tn.esprit.ticketmanagement.Ticket.entity.Ticket;
import tn.esprit.ticketmanagement.Ticket.enums.SuggestionType;
import tn.esprit.ticketmanagement.Ticket.enums.TicketStatus;
import tn.esprit.ticketmanagement.Ticket.repository.TicketRepository;
import tn.esprit.ticketmanagement.User.entity.User;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TicketSuggestionService {

    private final EmbeddingModel embeddingModel;
    private final @Qualifier("pgVectorJdbcTemplate") JdbcTemplate pgVectorJdbcTemplate;
    private final TicketRepository ticketRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    private static final double SIMILARITY_THRESHOLD = 0.5;
    private static final int TOP_K = 20;
    private static final int MAX_RESULTS = 5;

    private static final double KB_BOOST = 1.3;
    private static final double KB_RECENT_BOOST = 1.15;
    private static final double SAME_USER_BOOST = 1.1;

    private static final int RECENT_DAYS = 90;

    public TicketSuggestionResponse getSuggestions(TicketSuggestionRequest request, User currentUser) {
        String query = buildQuery(request);

        log.info("====== TICKET SUGGESTION DIAGNOSTIC ======");
        log.info("[DIAG] 1. Incoming query: '{}'", query);
        log.info("[DIAG] 2. Similarity threshold: {}", SIMILARITY_THRESHOLD);
        log.info("[DIAG] 3. Current user ID: {}", currentUser.getId());

        if (query.isBlank()) {
            log.warn("[DIAG] Query is blank, returning empty");
            return emptyResponse();
        }

        List<SuggestionItem> items = searchAndRank(query, currentUser);

        if (items.isEmpty()) {
            log.warn("[DIAG] searchAndRank returned 0 items after all filtering");
            return emptyResponse();
        }

        log.info("[DIAG] Final suggestions count: {}", items.size());
        for (SuggestionItem item : items) {
            log.info("[DIAG]   -> type={}, title='{}', score={}, linkedArticleId={}",
                    item.getType(), item.getTitle(), item.getSimilarityScore(), item.getLinkedArticleId());
        }

        String recommendation = generateRecommendation(items);

        double confidence = items.stream()
                .mapToDouble(SuggestionItem::getSimilarityScore)
                .max()
                .orElse(0.0);

        return TicketSuggestionResponse.builder()
                .aiRecommendation(recommendation)
                .confidence(Math.min(confidence, 1.0))
                .suggestions(items)
                .hasSuggestions(true)
                .build();
    }

    private String buildQuery(TicketSuggestionRequest request) {
        String title = request.getTitle() != null ? request.getTitle().trim() : "";
        String desc = request.getDescription() != null ? request.getDescription().trim() : "";
        return (title + " " + desc).trim();
    }

    private List<SuggestionItem> searchAndRank(String query, User currentUser) {
        try {
            log.info("[DIAG] 4. Generating embedding for query...");
            float[] queryVec = embeddingModel.embed(query);
            String vectorStr = toPgVector(queryVec);

            StringBuilder previewSb = new StringBuilder();
            for (int i = 0; i < Math.min(5, queryVec.length); i++) {
                if (i > 0) previewSb.append(", ");
                previewSb.append(String.format("%.6f", queryVec[i]));
            }
            String vecPreview = previewSb.toString();
            log.info("[DIAG] 5. Embedding (first 5 values): [{} ...] ({} dims)", vecPreview, queryVec.length);

            String sql = "SELECT content, metadata::text, " +
                    "1 - (embedding <=> ?::vector(768)) AS similarity " +
                    "FROM vector_store " +
                    "WHERE 1 - (embedding <=> ?::vector(768)) >= ? " +
                    "ORDER BY similarity DESC LIMIT ?";

            log.info("[DIAG] 6. Executing pgvector SQL with threshold={}, limit={}", SIMILARITY_THRESHOLD, TOP_K);

            List<Map<String, Object>> rows = pgVectorJdbcTemplate.queryForList(
                    sql, vectorStr, vectorStr, SIMILARITY_THRESHOLD, TOP_K);

            log.info("[DIAG] 7. Raw SQL returned {} rows", rows.size());

            if (rows.isEmpty()) {
                log.warn("[DIAG] 7a. NO ROWS returned from pgvector! No matches above threshold.");
                return List.of();
            }

            List<SuggestionItem> candidates = new ArrayList<>();
            int rowIndex = 0;

            for (Map<String, Object> row : rows) {
                rowIndex++;
                try {
                    String content = (String) row.get("content");
                    String metadataJson = (String) row.get("metadata");
                    double rawScore = ((Number) row.get("similarity")).doubleValue();

                    JsonNode meta = objectMapper.readTree(metadataJson);
                    String type = meta.has("type") ? meta.get("type").asText() : "UNKNOWN";

                    String contentPreview = content.length() > 80 ? content.substring(0, 80) + "..." : content;
                    log.info("[DIAG] 8. Row #{}: type={}, rawScore={}, content='{}', metadata={}",
                            rowIndex, type, String.format("%.4f", rawScore), contentPreview, metadataJson);

                    SuggestionItem item = null;

                    if ("TICKET".equals(type)) {
                        log.info("[DIAG] 8a. Row #{} is TICKET, calling processTicketResult", rowIndex);
                        item = processTicketResult(meta, rawScore, currentUser);
                    } else if ("KB_ARTICLE".equals(type)) {
                        log.info("[DIAG] 8b. Row #{} is KB_ARTICLE, calling processArticleResult", rowIndex);
                        item = processArticleResult(meta, rawScore);
                    } else if (meta.has("ticketId")) {
                        log.info("[DIAG] 8c. Row #{} metadata has ticketId but type={}, treating as TICKET", rowIndex, type);
                        item = processTicketResult(meta, rawScore, currentUser);
                    } else {
                        log.warn("[DIAG] 8d. Row #{} UNKNOWN type '{}', skipping", rowIndex, type);
                    }

                    if (item != null) {
                        candidates.add(item);
                        log.info("[DIAG] 9. Row #{} ACCEPTED as {}: title='{}', score={}", rowIndex, item.getType(), item.getTitle(), String.format("%.4f", item.getSimilarityScore()));
                    } else {
                        log.warn("[DIAG] 9. Row #{} DISCARDED (process* returned null)", rowIndex);
                    }
                } catch (Exception e) {
                    log.warn("[DIAG] Row #{} ERROR processing: {}: {}", rowIndex, e.getClass().getSimpleName(), e.getMessage());
                }
            }

            log.info("[DIAG] 10. Candidates before rankAndLimit: {}", candidates.size());
            List<SuggestionItem> result = rankAndLimit(candidates);
            log.info("[DIAG] 11. Results after rankAndLimit: {}", result.size());
            return result;

        } catch (Exception e) {
            log.warn("[DIAG] searchAndRank CATCH: {}: {}", e.getClass().getSimpleName(), e.getMessage());
            return List.of();
        }
    }

    private SuggestionItem processTicketResult(JsonNode meta, double rawScore, User currentUser) {
        int ticketId = meta.get("ticketId").asInt();
        log.info("[DIAG] processTicketResult: ticketId={}, rawScore={}", ticketId, String.format("%.4f", rawScore));

        Optional<Ticket> optTicket = ticketRepository.findById(ticketId);

        if (optTicket.isEmpty()) {
            log.warn("[DIAG] processTicketResult: ticket #{} NOT FOUND in DB, discarding", ticketId);
            return null;
        }

        Ticket ticket = optTicket.get();

        boolean isSameUser = ticket.getCreator().getId().equals(currentUser.getId());
        log.info("[DIAG] processTicketResult: ticket #{} found, title='{}', status={}, creatorId={}, isSameUser={}",
                ticketId, ticket.getTitle(), ticket.getStatus(), ticket.getCreator().getId(), isSameUser);

        if (!isSameUser) {
            if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED) {
                log.warn("[DIAG] processTicketResult: ticket #{} is OTHER_USER and status={} (not RESOLVED/CLOSED), discarding",
                        ticketId, ticket.getStatus());
                return null;
            }
        }

        // Check if a linked KB article with a solution exists
        log.info("[DIAG] processTicketResult: checking linked KB articles for ticket #{}", ticketId);
        List<KnowledgeBaseArticle> linkedArticles = knowledgeBaseRepository.findByTicketId(ticket.getId());
        if (linkedArticles.isEmpty()) {
            log.warn("[DIAG] processTicketResult: ticket #{} has NO linked KB article, discarding", ticketId);
            return null;
        }
        KnowledgeBaseArticle kb = linkedArticles.get(0);
        log.info("[DIAG] processTicketResult: found linked KB article #{} for ticket #{}", kb.getId(), ticketId);
        if (kb.getSolution() == null || kb.getSolution().isBlank()) {
            log.warn("[DIAG] processTicketResult: KB article #{} has EMPTY solution, discarding ticket #{}", kb.getId(), ticketId);
            return null;
        }
        log.info("[DIAG] processTicketResult: KB article #{} has solution (length={}), ACCEPTING ticket #{}",
                kb.getId(), kb.getSolution().length(), ticketId);

        SuggestionType type = isSameUser ? SuggestionType.SAME_USER_TICKET : SuggestionType.OTHER_USER_TICKET;

        SuggestionItem.SuggestionItemBuilder builder = SuggestionItem.builder()
                .type(type)
                .similarityScore(rawScore)
                .title(ticket.getTitle())
                .linkedArticleId(kb.getId())
                .resolvedDate(ticket.getResolvedDate() != null
                        ? ticket.getResolvedDate().format(DateTimeFormatter.ISO_LOCAL_DATE)
                        : (ticket.getClosedDate() != null
                            ? ticket.getClosedDate().format(DateTimeFormatter.ISO_LOCAL_DATE)
                            : null));

        if (isSameUser) {
            builder.ticketId(ticket.getId());
            builder.description(ticket.getDescription());
        }

        return builder.build();
    }

    private SuggestionItem processArticleResult(JsonNode meta, double rawScore) {
        long articleId = meta.get("articleId").asLong();
        log.info("[DIAG] processArticleResult: articleId={}, rawScore={}", articleId, String.format("%.4f", rawScore));

        Optional<KnowledgeBaseArticle> optArticle = knowledgeBaseRepository.findById(articleId);

        if (optArticle.isEmpty()) {
            log.warn("[DIAG] processArticleResult: article #{} NOT FOUND in DB, discarding", articleId);
            return null;
        }

        KnowledgeBaseArticle article = optArticle.get();
        log.info("[DIAG] processArticleResult: article #{} found, title='{}', solutionLength={}",
                articleId, article.getTitle(),
                article.getSolution() != null ? article.getSolution().length() : 0);

        return SuggestionItem.builder()
                .type(SuggestionType.KB_ARTICLE)
                .similarityScore(rawScore)
                .title(article.getTitle())
                .articleId(article.getId())
                .description(article.getDescription())
                .solution(article.getSolution())
                .createdAt(article.getCreatedAt() != null
                        ? article.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE)
                        : null)
                .linkedTicketId(article.getTicketId())
                .build();
    }

    private List<SuggestionItem> rankAndLimit(List<SuggestionItem> candidates) {
        LocalDate cutoff = LocalDate.now().minusDays(RECENT_DAYS);
        log.info("[DIAG] rankAndLimit: processing {} candidates, cutoff={}", candidates.size(), cutoff);

        List<ScoredItem> scored = new ArrayList<>();
        int discardedAfterBoost = 0;

        for (int i = 0; i < candidates.size(); i++) {
            SuggestionItem item = candidates.get(i);
            double adjusted = item.getSimilarityScore();
            String boostInfo = "none";

            if (item.getType() == SuggestionType.KB_ARTICLE) {
                adjusted *= KB_BOOST;
                boostInfo = "KB_BOOST(1.3)";

                if (item.getCreatedAt() != null) {
                    try {
                        LocalDate articleDate = LocalDate.parse(item.getCreatedAt());
                        if (articleDate.isAfter(cutoff)) {
                            adjusted *= KB_RECENT_BOOST;
                            boostInfo += "+RECENT(1.15)";
                        }
                    } catch (Exception ignored) {}
                }
            } else if (item.getType() == SuggestionType.SAME_USER_TICKET) {
                adjusted *= SAME_USER_BOOST;
                boostInfo = "SAME_USER_BOOST(1.1)";
            }

            double beforeClip = adjusted;
            adjusted = Math.min(adjusted, 1.0);

            log.info("[DIAG] rankAndLimit #{}: type={}, title='{}', originalScore={}, boost={}, adjustedBeforeClip={}, adjusted={}, threshold={}",
                    i, item.getType(), item.getTitle(),
                    String.format("%.4f", item.getSimilarityScore()),
                    boostInfo,
                    String.format("%.4f", beforeClip),
                    String.format("%.4f", adjusted),
                    SIMILARITY_THRESHOLD);

            if (adjusted >= SIMILARITY_THRESHOLD) {
                scored.add(new ScoredItem(item, adjusted));
                log.info("[DIAG] rankAndLimit #{}: ACCEPTED ({} >= {})", i, String.format("%.4f", adjusted), SIMILARITY_THRESHOLD);
            } else {
                discardedAfterBoost++;
                log.warn("[DIAG] rankAndLimit #{}: DISCARDED ({} < {})", i, String.format("%.4f", adjusted), SIMILARITY_THRESHOLD);
            }
        }

        scored.sort((a, b) -> Double.compare(b.adjustedScore, a.adjustedScore));

        log.info("[DIAG] rankAndLimit: after boost+threshold: {} accepted, {} discarded, MAX_RESULTS={}",
                scored.size(), discardedAfterBoost, MAX_RESULTS);

        return scored.stream()
                .limit(MAX_RESULTS)
                .map(s -> {
                    s.item.setSimilarityScore(s.adjustedScore);
                    log.info("[DIAG] rankAndLimit FINAL: type={}, title='{}', finalScore={}",
                            s.item.getType(), s.item.getTitle(), String.format("%.4f", s.adjustedScore));
                    return s.item;
                })
                .collect(Collectors.toList());
    }

    private String generateRecommendation(List<SuggestionItem> items) {
        if (items.isEmpty()) {
            return "";
        }

        SuggestionItem top = items.get(0);

        String typeLabel;
        switch (top.getType()) {
            case KB_ARTICLE:
                typeLabel = "un article de la base de connaissances";
                break;
            case SAME_USER_TICKET:
                typeLabel = "un ticket similaire que vous avez déjà créé";
                break;
            default:
                typeLabel = "un problème similaire";
                break;
        }

        String prompt = String.format(
                "Tu es un assistant IT. Génère EXACTEMENT 2 phrases concises en français " +
                "pour recommander une solution à un utilisateur.\n\n" +
                "Contexte:\n" +
                "- Type de suggestion: %s\n" +
                "- Titre: %s\n" +
                "- Score: %.0f%%\n\n" +
                "Règles:\n" +
                "- EXACTEMENT 2 phrases\n" +
                "- Pas de salutation\n" +
                "- Pas de mention du score\n" +
                "- Direct et utile\n" +
                "- Suggère de consulter la solution proposée",
                typeLabel, top.getTitle(), top.getSimilarityScore() * 100);

        try {
            String response = chatClient.prompt().user(prompt).call().content();
            if (response != null) {
                String cleaned = response.trim();
                String[] sentences = cleaned.split("(?<=[.!?])\\s+");
                if (sentences.length > 2) {
                    cleaned = sentences[0] + " " + sentences[1];
                }
                return cleaned;
            }
        } catch (Exception e) {
            log.warn("Ollama recommendation failed, using fallback: {}", e.getMessage());
        }

        return generateFallbackRecommendation(top);
    }

    private String generateFallbackRecommendation(SuggestionItem top) {
        switch (top.getType()) {
            case KB_ARTICLE:
                return "Un article de la base de connaissances correspond à votre probl\u00e8me. Consultez la solution sugg\u00e9r\u00e9e ci-dessous.";
            case SAME_USER_TICKET:
                return "Vous avez d\u00e9j\u00e0 rencontr\u00e9 un probl\u00e8me similaire qui a \u00e9t\u00e9 r\u00e9solu. V\u00e9rifiez les d\u00e9tails de votre ticket pr\u00e9c\u00e9dent.";
            default:
                return "Des tickets similaires ont \u00e9t\u00e9 r\u00e9solus pour d'autres utilisateurs. Consultez les suggestions ci-dessous.";
        }
    }

    private TicketSuggestionResponse emptyResponse() {
        return TicketSuggestionResponse.builder()
                .aiRecommendation("")
                .confidence(0.0)
                .suggestions(List.of())
                .hasSuggestions(false)
                .build();
    }

    private String toPgVector(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(vector[i]);
        }
        sb.append("]");
        return sb.toString();
    }

    private record ScoredItem(SuggestionItem item, double adjustedScore) {}
}
