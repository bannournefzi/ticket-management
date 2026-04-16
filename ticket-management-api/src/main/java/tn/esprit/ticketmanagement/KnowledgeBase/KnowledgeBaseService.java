package tn.esprit.ticketmanagement.KnowledgeBase;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.esprit.ticketmanagement.Ticket.Ticket;
import tn.esprit.ticketmanagement.Ticket.TicketRepository;
import tn.esprit.ticketmanagement.Ticket.TicketStatus;
import tn.esprit.ticketmanagement.User.entity.User;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeBaseService {

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final TicketRepository ticketRepository;

    @Transactional
    public KnowledgeBaseArticleDTO createArticleFromTicket(Integer ticketId, CreateKnowledgeBaseArticleRequest request, User currentUser) {
        if (!currentUser.isBusinessAnalyst()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Seul un Business Analyst peut créer un article à partir d'un ticket");
        }

        Ticket ticket = null;
        if (ticketId != null) {
            ticket = ticketRepository.findById(ticketId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Ticket introuvable avec l'id: " + ticketId));

            if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Le ticket doit être en statut Résolu ou Fermé pour être converti en article");
            }
        }

        KnowledgeBaseArticle article = KnowledgeBaseArticle.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .solution(request.getSolution())
                .createdBy(currentUser)
                .createdByName(currentUser.fullName())
                .ticketId(ticketId)
                .build();

        KnowledgeBaseArticle saved = knowledgeBaseRepository.save(article);

        // Mark ticket as converted to KB if ticket exists
        if (ticket != null) {
            ticket.setConvertedToKB(true);
            ticketRepository.save(ticket);
        }

        log.info("Article created from ticket {} by user {}", ticketId, currentUser.fullName());

        return convertToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<KnowledgeBaseArticleDTO> getAllArticles() {
        return knowledgeBaseRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public KnowledgeBaseArticleDTO getArticleById(Long id) {
        KnowledgeBaseArticle article = knowledgeBaseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Article introuvable avec l'id: " + id));
        return convertToDTO(article);
    }

    @Transactional(readOnly = true)
    public List<KnowledgeBaseArticleDTO> searchArticles(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllArticles();
        }
        return knowledgeBaseRepository.searchByKeyword(keyword.trim()).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private KnowledgeBaseArticleDTO convertToDTO(KnowledgeBaseArticle article) {
        return KnowledgeBaseArticleDTO.builder()
                .id(article.getId())
                .title(article.getTitle())
                .description(article.getDescription())
                .solution(article.getSolution())
                .createdAt(article.getCreatedAt())
                .createdById(article.getCreatedBy().getId())
                .createdByName(article.getCreatedByName())
                .ticketId(article.getTicketId())
                .build();
    }

    @Transactional
    public void deleteArticle(Long articleId, User currentUser) {
        if (!currentUser.isBusinessAnalyst()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Seul un Business Analyst peut supprimer un article");
        }

        KnowledgeBaseArticle article = knowledgeBaseRepository.findById(articleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Article introuvable avec l'id: " + articleId));

        // If linked to a ticket, update the ticket
        if (article.getTicketId() != null) {
            ticketRepository.findById(article.getTicketId()).ifPresent(ticket -> {
                ticket.setConvertedToKB(false);
                ticketRepository.save(ticket);
                log.info("Ticket {} marked as not converted to KB", ticket.getId());
            });
        }

        knowledgeBaseRepository.delete(article);
        log.info("Article {} deleted by user {}", articleId, currentUser.fullName());
    }
}