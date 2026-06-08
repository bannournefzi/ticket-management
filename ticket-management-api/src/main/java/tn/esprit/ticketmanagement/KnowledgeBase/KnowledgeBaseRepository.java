package tn.esprit.ticketmanagement.KnowledgeBase;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.ticketmanagement.KnowledgeBase.entity.KnowledgeBaseArticle;

import java.util.List;

@Repository
public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBaseArticle, Long> {

    @Query("SELECT a FROM KnowledgeBaseArticle a WHERE " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(a.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(a.solution) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY a.createdAt DESC")
    List<KnowledgeBaseArticle> searchByKeyword(@Param("keyword") String keyword);

    List<KnowledgeBaseArticle> findByTicketId(Integer ticketId);

    List<KnowledgeBaseArticle> findByCategory(String category);
}