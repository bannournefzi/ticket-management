package tn.esprit.ticketmanagement.KnowledgeBase;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "knowledge_trees")
@EntityListeners(AuditingEntityListener.class) // Pour gérer la date de création automatiquement
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class TroubleshootingTree {

    @Id
    @Column(name = "tree_id", length = 50)
    private String id; // L'ID sera manuel, ex: "vpn-issue", "printer-issue"

    @Column(nullable = false, length = 200)
    private String title; // Ex: "Problème d'accès à l'ERP"

    @Column(name = "description_for_ai", columnDefinition = "TEXT")
    private String descriptionForAi; // Ce qui aidera Ollama plus tard

    // Demande à Hibernate 6 de transformer automatiquement le JSON Java vers le type JSONB de PostgreSQL
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tree_json_content", columnDefinition = "jsonb", nullable = false)
    private String treeJsonContent;

    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}